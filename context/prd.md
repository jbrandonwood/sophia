# Product Requirement Document (PRD): Sophia – Socratic Interlocutor

**Project Lead:** Brandon Wood  
**Status:** Ready for Implementation  
**Platform:** Web (Next.js) + Mobile (Capacitor)  

---

## 1. Vision & Purpose
Sophia is a dialectic AI agent designed to act as a **Socratic Interlocutor**. Unlike standard assistants that provide answers or summaries, Sophia uses a discursive, multi-turn approach to help users explore their own logic and philosophical premises. It is grounded strictly in the **Ancient Philosophical Canon** (Plato, Aristotle, Stoics, etc.).

---

## 2. Core Personas
* **The Discursive Student:** Wants to pressure-test their understanding of a specific text (e.g., *The Republic*).
* **The Ethical Practitioner:** Seeking to explore personal challenges through the lens of Stoic or Virtue Ethics.
* **The Logic Builder:** Using the agent to find inconsistencies in their own current project or life premises.

---

## 3. Functional Requirements

### 3.1 Dialectic Reasoning Engine (The Interlocutor Model)
* **FR 1.1: Socratic Loop:** The agent must prioritize questioning over answering. It should follow the "Elicit -> Examine -> Aporia" logical loop.
* **FR 1.2: Turn-Based Evolution:** The system must track the user’s evolving definitions of a concept across the thread.
* **FR 1.3: Anti-Summary Constraint:** Proactively refuse requests for "3 key bullet points." The agent should insist on exploring the nuance of one point at a time.

### 3.2 Knowledge & Grounding (RAG)
* **FR 2.1: Ancient Canon Ingestion:** Grounding data must be restricted to verified public domain translations of primary ancient texts.
* **FR 2.2: Hard Citations:** Every claim made by the AI must be pinned to a source artifact (e.g., "Aurelius, Meditations, IV.3").
* **FR 2.3: Hallucination Prevention:** If a premise isn't in the data, the agent must admit ignorance or state that the specific question falls outside its ancient grounding.

---

## 4. User Experience (UX) & Design

### 4.1 UI Style
* **Design Framework:** Clean, minimal layout using **Tailwind CSS** and **shadcn/ui**.
* **Focus Mode:** A "discursive-first" chat interface that minimizes distractions.
* **Dialectic Progress:** A subtle visual indicator of the current "thesis" being explored.

### 4.2 Cross-Platform Strategy
* **Web:** Responsive Next.js application.
* **Mobile:** Deployment via **Capacitor** to wrap the Next.js bundle for iOS and Android.

---

## 5. Technical Constraints
* **Intelligence:** Gemini 3.0 Pro/Flash via **Vertex AI**.
* **Latency:** Inter-turn reasoning should ideally be under 3 seconds to maintain conversational flow.
* **Scale:** Backend deployed on **Google Cloud Run** for efficient, containerized scaling.

---

## 6. Success Metrics
* **Depth of Inquiry:** Average turns per session (Goal: >8 turns).
* **Grounding Fidelity:** Percentage of turns containing a valid citation.
* **User Retention:** Weekly active usage for long-form philosophical exploration.

---

## 7. Out of Scope (Non-Goals)
* General-purpose AI assistant capabilities (weather, math, coding help).
* Discussion of modern political figures or current events.
* Automatic summarization of entire books.