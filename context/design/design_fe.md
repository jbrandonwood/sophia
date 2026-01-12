# Feature Specification: Frontend Design System (Sophia)
**Project:** Sophia (The Socratic Interlocutor)
**Module:** UI/UX Framework
**Proposed System:** shadcn/ui (Radix Primitives + Tailwind CSS)

---

## 1. Executive Summary
Sophia differs fundamentally from standard LLM agents. Where standard agents prioritize speed and summarization, Sophia prioritizes **friction, depth, and the dialectic process**.

To support this, we require a design system that is "invisible"—one that recedes to let the text and logic take center stage. We are selecting **shadcn/ui** over component heavy-weights (like Material UI or AntD) because it provides headless primitives (Radix) with accessible defaults, allowing us to craft a bespoke "Reading Room" aesthetic without fighting opinionated library styles.

## 2. Design Philosophy: "The Digital Stoa"
The interface must emulate the clarity of a clean page or a quiet portico.
* **Minimalism over Decoration:** No unnecessary shadows, gradients, or playful animations.
* **Typography as UI:** Since 90% of the interaction is reading/writing, type hierarchy replaces traditional buttons and badges.
* **Focus State:** The UI must support deep work (The Logic Builder persona) by minimizing peripheral distractions.

## 3. Technical Dependencies
* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS
* **Component Primitive:** shadcn/ui (built on Radix UI)
* **Icons:** Lucide React (Stroke weight: Thin/Light to match the elegance)

---

## 4. Component Architecture & Mapping

### 4.1 The Dialogue Stream (Mapping FR 1.1: Socratic Loop)
Standard chat bubbles suggest "messaging." Sophia requires "dialogue."
* **Component:** `ScrollArea` + Custom Layout.
* **Implementation:** instead of bubbles, use a "Script Format" layout (Left-aligned names, indented text).
* **Reasoning:** This mirrors the format of a Plato dialogue, subtly encouraging the user to view the interaction as a collaborative philosophical investigation rather than a transactional Q&A.

### 4.2 The Canon Reference (Mapping FR 2.2: Hard Citations)
Citations must be unobtrusive but instantly verifiable.
* **Component:** `HoverCard` or `Popover`.
* **Implementation:** When Sophia cites a text (e.g., *Meditations, IV.3*), the text is underlined with a dotted decoration. Hovering triggers a `HoverCard` displaying the raw snippet from the primary text source.
* **Reasoning:** This maintains flow for the "Discursive Student" while providing instant rigorous grounding for the "Ethical Practitioner."

### 4.3 Logic Threading (Mapping FR 1.2: Turn-Based Evolution)
As users define concepts, definitions evolve. We need to track this history without cluttering the main view.
* **Component:** `Sheet` (Side Drawer) or `Accordion`.
* **Implementation:** A "Premise Tracker" sidebar using a `Sheet` component. As the user admits to a premise, it is logged here.
* **Reasoning:** This supports the "Logic Builder" persona. Users can see their own logical construct growing in real-time on the side, separate from the chat stream.

### 4.4 The "Anti-Summary" View (Mapping FR 1.3)
We must discourage scanning.
* **Component:** `Typography` (prose).
* **Implementation:** Enforce a maximum line width (`max-w-prose` or ~65 chars) to ensure comfortable reading speed. Use `Separator` components to break distinct logical thoughts, rather than bullet points.

---

## 5. Typography System
The visual identity relies on the tension between the Ancient and the Modern.

### 5.1 The Canon Voice (Serif)
* **Font Family:** *EB Garamond* or *Merriweather*.
* **Usage:** Sophia’s responses, primary headings, and citations.
* **Vibe:** Academic, timeless, authoritative.

### 5.2 The User/System Voice (Sans)
* **Font Family:** *Inter* or *Geist Sans*.
* **Usage:** User input fields, sidebar navigation, system metadata.
* **Vibe:** Neutral, functional, clear.

---

## 6. Theming (Tailwind Config)
We will avoid standard "Blue/Primary" SaaS palettes in favor of organic, material tones.

* **Background:** `Slate-50` or a custom "Papyrus" off-white (#F9F8F4).
* **Foreground (Text):** `Slate-900` (Never pure black).
* **Accents:** `Stone-500` (for borders/separators).
* **Interaction Color:** A deep, muted "Philosopher’s Blue" or "Tyrian Purple" (e.g., `#4C1D95`) used very sparingly for active states only.