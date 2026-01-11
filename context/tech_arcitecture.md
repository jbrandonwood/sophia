# Technical Design Document: Sophia – Socratic Interlocutor

**Project Lead:** Brandon Wood  
**Date:** January 10, 2026  
**Infrastructure:** Google Cloud Platform (GCP)  
**Deployment:** GitHub Actions -> Google Cloud Run  

---

## 1. System Architecture
Sophia utilizes a **Retrieval-Augmented Generation (RAG)** architecture. The front-end serves as the interface for multi-turn dialectic, while the backend leverages Vertex AI to process ancient texts and maintain philosophical logic.

### 1.1 Tech Stack
* **Front-end:** Next.js (React), Tailwind CSS, shadcn/ui.
* **Mobile Wrapper:** Capacitor (Cross-platform bridge).
* **Backend:** Google Cloud Run (Containerized Node.js/Next.js environment).
* **Intelligence:** Vertex AI SDK (Gemini 3.0 Pro/Flash).
* **Vector Database:** Pinecone (Managed) or Vertex AI Search (Vector Store).
* **CI/CD:** GitHub Actions.



---

## 2. Infrastructure & Backend (GCP)

### 2.1 Model Orchestration (Vertex AI)
* **Model:** Gemini 3.0.
* **Reasoning:** Deep Think mode for handling complex, multi-turn philosophical mapping.
* **Grounding:** Vertex AI RAG Engine to anchor responses to the "Ancient Canon" (Plato, Aristotle, Stoics) stored in **Google Cloud Storage (GCS)**.

### 2.2 Computation (Cloud Run)
* **Deployment:** Application deployed as a containerized service on **Cloud Run**.
* **Scaling:** Automatic scaling from 0 to N instances (Scale-to-Zero) to manage costs.
* **Execution:** Node.js runtime for Next.js SSR and internal API routes.

---

## 3. Data Design
* **Corpus Storage:** Primary philosophical texts stored in GCS buckets.
* **Vectorization:** Text is chunked into semantic-logical units (approx. 512 tokens) and embedded using `text-embedding-004`.
* **Conversation State:** Multi-turn memory is managed via a lightweight session store (Firestore) to track the user's evolving "Thesis" for the Socratic loop.

---

## 4. Deployment Pipeline (GitHub to GCP)
Implementation of a **GitOps** workflow. Pushing to the `main` branch triggers an automated deployment via GitHub Actions.

### 4.1 Deployment Workflow
1.  **Build:** Create a Docker image of the Next.js application.
2.  **Auth:** Authenticate with GCP using **Workload Identity Federation** (no static keys).
3.  **Push:** Upload the image to **Google Artifact Registry**.
4.  **Deploy:** Update the Cloud Run service with the new image tag.

---

## 5. Security & Governance
* **Secrets:** API keys (Pinecone, Gemini) are stored in **Google Cloud Secret Manager** and injected into Cloud Run at runtime.
* **IAM:** Principle of Least Privilege; GitHub Action service account limited to `Artifact Registry Writer` and `Cloud Run Developer`.

---

## 6. Antigravity Agent Configuration
* **Manager Agent:** Assigned to initialize the GitHub repo with this TDD context.
* **Editor Agent:** Assigned to generate the `Dockerfile` and `next.config.js`.
* **Browser Agent:** Assigned to verify Vertex AI SDK RAG Engine compatibility for Node.js.