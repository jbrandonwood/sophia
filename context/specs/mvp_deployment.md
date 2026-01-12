# Feature Spec: MVP Deployment & Authentication

## 1. Overview
This specification covers the deployment of the initial user-facing version of **Sophia**. The primary objectives are to establish a secure authentication layer using **Firebase**, deploy the Next.js container to **Google Cloud Run**, and ensure user conversation state is persisted via **Firestore** (to support LangGraph).

## 2. Technical Goals
* **Secure Access:** Implement Firebase Authentication (Google + Email/Password) to gate the application.
* **Unified Persistence:** Use **Firestore** as the single source of truth for both User Profiles and LangGraph Conversation Threads.
* **Serverless Deployment:** Deploy the Next.js application to Google Cloud Run with "Scale-to-Zero" configuration.
* **Identity Propagation:** Ensure the authenticated User ID (`uid`) is passed securely to the LangGraph agent to enable personalized memory.

## 3. Architecture: The "Auth Sandwich"

### 3.1 Client-Side (Next.js)
* **Library:** `firebase/auth` (Client SDK).
* **UI Components:**
    * Sign-in Page (Shadcn Card with "Sign in with Google").
    * Protected Route Wrapper (`<AuthGuard>`) that redirects unauthenticated users.
* **Token Handling:** On every API call to `/api/chat`, the client intercepts the request, fetches the current `IdToken` from Firebase, and attaches it as a Bearer token: `Authorization: Bearer <firebase_id_token>`.

### 3.2 Server-Side (Next.js API Routes)
* **Library:** `firebase-admin` (Server SDK).
* **Middleware:** Create a robust middleware function `verifyAuth(req)` that:
    1.  Decodes the Bearer token.
    2.  Verifies the signature against Google's public keys.
    3.  Extracts the `uid`.
    4.  Injects the `uid` into the request context for LangGraph.

### 3.3 State Persistence (Firestore)
We will leverage Firestore for two distinct purposes:
1.  **User Metadata:** `users/{uid}` – Stores preference settings (e.g., "Stoic Mode", "Dark Mode").
2.  **LangGraph Checkpoints:** `threads/{thread_id}` – Stores the serialized state of the agentic conversation.
    * *Implementation:* Custom `FirestoreCheckpointSaver` class to adapt LangGraph's state interface to Firestore documents.

## 4. Infrastructure Specifications (Antigravity)

### 4.1 Firebase Provisioning
The **Antigravity** infrastructure agent must execute the following via Terraform or gcloud CLI:
* **Enable Firebase:** Link the existing GCP Project (`sophia-prod`) to Firebase.
* **Enable Auth Providers:** Activate `GoogleAuthProvider` and `EmailAuthProvider`.
* **Provision Firestore:** Create a Firestore database in `Native Mode` (Region: `us-central1`).

### 4.2 Cloud Run Configuration
* **Service Name:** `sophia-web`
* **CPU/Memory:** 1 CPU, 512MB RAM (Start small, scale up based on Gemini latency).
* **Concurrency:** 80 requests per instance.
* **Environment Variables (Injected via Secret Manager):**
    * `NEXT_PUBLIC_FIREBASE_API_KEY`: [Public]
    * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: [Public]
    * `FIREBASE_CLIENT_EMAIL`: [Secret]
    * `FIREBASE_PRIVATE_KEY`: [Secret]
    * `GOOGLE_VERTEX_PROJECT_ID`: [Secret]
    * `VERTEX_SEARCH_DATA_STORE_ID`: [Secret]

## 5. Deployment Pipeline (GitHub Actions)

### 5.1 Build & Push
The `deploy.yaml` workflow must be updated to include build arguments for public keys:
```yaml
- name: Build and Push Container
  run: |-
    docker build \
      --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }} \
      -t us-central1-docker.pkg.dev/$PROJECT_ID/repo/sophia-web:$GITHUB_SHA .
    docker push ...

### 5.2 Revision Deployment
Post-push, trigger a gcloud run deploy command that maps the latest image to the service URL.

## 6. Functional Requirements
IDRequirementAcceptance CriteriaFR-01User LoginUser can sign in with Google Account. Non-whitelisted domains (optional) are rejected if strictly internal.FR-02Session PersistenceUser refreshes the page and remains logged in.FR-03Secure ChatRequests to /api/chat without a valid token return 401 Unauthorized.FR-04Thread HistoryUser sees a sidebar of past conversations; clicking one loads the LangGraph state from Firestore.FR-05Profile IsolationUser A cannot access User B's conversation threads (enforced via Firestore Security Rules).

## 7. Firestore Security Rules
Strict rules to ensure data isolation:
```JavaScript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User Profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Conversation Threads (LangGraph)
    match /threads/{threadId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      // Allow create if setting own ID
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```
## 8. Success Metrics (MVP)
* Auth Latency: Login process completes in < 2 seconds.
* Cold Start: Cloud Run scales from 0 to 1 and serves the app in < 3 seconds.
* State Recovery: Chat history loads accurately from Firestore with zero message loss.