# Technical Design Document: Sophia – Socratic Interlocutor

**Project Lead:** Brandon Wood  
**Date:** January 10, 2026  
**Infrastructure:** Google Cloud Platform (GCP)  
**Deployment:** GitHub Actions -> Google Cloud Run  

---

## 1. System Architecture
Sophia utilizes a **Retrieval-Augmented Generation (RAG)** architecture with a strict "Grounding" requirement. The front-end serves as a fluid, dialectical interface using the Vercel AI SDK, while the backend leverages **LangGraph** to orchestrate the Socratic state machine, anchoring Gemini 3.0 in a curated philosophical canon via Vertex AI Search.

### 1.1 Tech Stack
* **Front-end:** Next.js (React), Tailwind CSS (v4), shadcn/ui.
* **Design System:** "The Digital Stoa" – Minimalist, excessive typography, "Papyrus" aesthetics.
* **Component Architecture:**
    * **Dialogue Stream:** Script format (no bubbles), `ScrollArea`.
    * **Canon Reference:** Hover-based citations (`HoverCard` / `Popover`).
    * **Logic Threading:** Premise tracking via `Sheet` (Side Drawer).
    * **Anti-Summary:** Prose typography, max-w-prose.
* **Chat Engine:** Vercel AI SDK (`ai`, `@ai-sdk/google`).
* **Agent Framework:** LangGraph (Stateful orchestration & cyclic flows).
* **Rendering:** `react-markdown` + `remark-gfm` (for hard citations and footnotes).
* **Motion:** `framer-motion` (for thesis evolution states).
* **Mobile Wrapper:** Capacitor (Cross-platform bridge).
* **Backend:** Google Cloud Run (Containerized Node.js/Next.js environment).
* **Intelligence:** Vertex AI SDK (Gemini 3.0).
* **Knowledge Base:** Vertex AI Search (Enterprise Edition).
* **CI/CD:** GitHub Actions.

---

## 2. Infrastructure & Backend (GCP)

### 2.1 Agent Orchestration (LangGraph & Vertex AI)
* **Model:** Gemini 3.0.
* **Orchestration:** **LangGraph** manages the cognitive architecture, enforcing the "Elicit → Examine → Aporia" dialectic loop. It handles the decision logic between calling the "Librarian" (Search) vs. the "Philosopher" (Reasoning).
* **Reasoning:** Deep Think mode configured for complex, multi-turn philosophical mapping.
* **Grounding:** * **Engine:** Vertex AI Search (Enterprise Edition) configured for `EXTRACTIVE_SEGMENTS`.
    * **Source:** `master_corpus_deduplicated.jsonl` stored in GCS.
    * **Citation Logic:** System forces "Hard Citations" (e.g., [Plato, Republic, Book I]) derived directly from search metadata.

### 2.2 Computation (Cloud Run)
* **Deployment:** Application deployed as a containerized service on **Cloud Run**.
* **Scaling:** Automatic scaling from 0 to N instances (Scale-to-Zero) to manage costs.
* **Execution:** Node.js runtime for Next.js SSR and internal API routes.

---

## 3. Data Design
* **Corpus Storage:** Primary philosophical texts normalized into JSONL format and stored in **Google Cloud Storage (GCS)** (`gs://sophia-corpus-production`).
* **Ingestion Strategy:** * **Format:** JSONL (`Unstructured data with metadata`).
    * **Chunking:** Vertex AI Native Auto-Chunking (Digital Parser) with `layoutBasedChunking` enabled to respect semantic boundaries.
    * **Indexing:** Enterprise Gen AI App index to support extraction and citation.
* **Conversation State:** **LangGraph Checkpointers** (persisted via Firestore or PostgreSQL) manage the long-term state, preserving the user's "Thesis" and "Belief Graph" across sessions to prevent context loss.

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
* **Secrets:** API keys and Project IDs are stored in **Google Cloud Secret Manager** and injected into Cloud Run at runtime.
* **IAM:** Principle of Least Privilege; GitHub Action service account limited to `Artifact Registry Writer` and `Cloud Run Developer`. Antigravity Service Account limited to `Discovery Engine Admin` and `Storage Object Admin`.

---

## 6. Antigravity Agent Configuration
Antigravity is the infrastructure provisioning and data synchronization module.

* **Manager Agent:** Assigned to initialize the GitHub repo and manage TDD context.
* **Infrastructure Agent:** Responsible for provisioning the GCS Bucket (`sophia-corpus-production`) and the Vertex AI Data Store (`sophia-kb-v1`).
* **Data Agent:** Handles the `antigravity sync` command:
    * Validates JSONL integrity (checking for >25MB records).
    * Uploads to GCS.
    * Triggers the `importDocuments` operation on Vertex AI Search.