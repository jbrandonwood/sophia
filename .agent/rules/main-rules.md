---
trigger: always_on
---

# Antigravity Workspace Rules: Sophia
## Project Verification
- **Project Name:** Sophia (Socratic Interlocutor)
- **Role:** Senior Full-Stack Engineer & Philosopher
- **Primary stack:** Next.js (App Router), Tailwind CSS (v4), shadcn/ui, LangGraph, Google Cloud Platform (Vertex AI, Cloud Run).
## 1. Design Philosophy: "The Digital Stoa"
- **Aesthetic:** Radical minimalism ("Invisible UI"). Content is king.
- **Typography:**
  - **AI/Canon:** *Serif* (EB Garamond/Merriweather) - Authoritative, timeless.
  - **User/System:** *Sans* (Inter/Geist) - Functional, neutral.
- **Layout:**
  - **Chat:** NEVER use chat bubbles. Use a "Script Format" (Left-aligned names, indented text) to simulate a play or dialogue.
  - **Width:** Enforce `max-w-prose` (~65 chars) for reading comfort.
- **Components:** favor `shadcn/ui` primitives. Avoid "SaaS Blue"; use "Papyrus" off-whites (#F9F8F4) and "Philosopher’s Blue/Purple" (#4C1D95) for interactions.
## 2. Functional Mandates (The Socratic Loop)
- **Anti-Summary:** NEVER offer to summarize text. The goal is *depth* and *aporia*, not efficiency.
- **Hard Citations:** All logic must cite the source text (e.g., `[Plato, Republic, Book I]`) using strict metadata citations.
- **State:** Use **LangGraph** for all conversational logic. The system is a state machine (Elicit -> Examine -> Aporia), not a simple chatbot.
## 3. Technology Stack & Constraints
- **Frontend:**
  - Framework: Next.js (App Router).
  - Styling: Tailwind CSS (v4). Do NOT use arbitrary values if a token exists.
  - Icons: Lucide React (Stroke: Thin/Light).
- **Backend/AI:**
  - Runtime: Node.js on Google Cloud Run.
  - Orchestration: LangGraph.
  - RAG: Vertex AI Search (Enterprise) with `extractive_segments`.
- **Infrastructure:**
  - Auth: Firebase Auth / GCP Workload Identity.
  - Deploy: GitHub Actions -> Cloud Run.
## 4. Coding Standards
- **react-markdown:** Use `react-markdown` + `remark-gfm` to render all AI output.
- **Client/Server:** Default to Server Components. Use `'use client'` only for interactive islands (e.g., the Input, the ScrollArea).
- **Types:** Strict TypeScript. No `any`. Define interfaces for all LangGraph states.
## 5. Documentation Standards (The "Why" > The "What")
1.  **Module Level (READMEs):** Every critical directory (`/lib`, `/graphs`, `/components/complex`) MUST have a `README.md` explaining:
    *   **Responsibility:** What problem does this folder solve?
    *   **Key Files:** Which files are the entry points?
2.  **Interface Level (JSDoc/Docstring):** All **exported** functions, classes, and types must have a JSDoc (TS) or Docstring (Python) block.
    *   *Must include:* `@param` definitions and a 1-line summary.
    *   *Aim:* This powers IDE hover-over tooltips, making the code "self-discovering."
3.  **Inline Level (The "Heads Up"):**
    *   **Do Not:** Comment on what the code does (e.g., `// loop through list`).
    *   **Do:** Comment on *Business Logic* or *Weird Fixes*. (e.g., `// Using a set here because deduping on the client is cheaper than re-fetching`).