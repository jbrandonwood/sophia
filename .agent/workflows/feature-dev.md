---
description: End-to-end workflow for planning, implementing, and verifying a new feature
---


1.  **Context Loading**:
    - **Product Vision:** Read [context/prd.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/prd.md:0:0-0:0) to ensure the feature aligns with the "Socratic Interlocutor" goals (e.g., Anti-Summary, Discursive depth).
    - **Architecture:** Read [context/tech_arcitecture.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/tech_arcitecture.md:0:0-0:0) to verify where this feature fits (e.g., does it belong in LangGraph or the Client?).
    - **Design System:** (If UI is involved) Read [context/design/design_fe.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/design/design_fe.md:0:0-0:0) to refresh on "Digital Stoa" aesthetics.
    - **Feature Spec:** Read the specific `context/specs/[feature_name].md`. *If this file does not exist, ASK the user to provide it or draft a quick one.*
2.  **Implementation Planning**:
    - Create or update validity of `implementation_plan.md`.
    - **Data First:** Define the TypeScript interfaces/types for the new feature before writing logic.
    - **Component Map:** List the new files to be created.
    - **Check:** Does this plan violate any "User Rules" (e.g., using chat bubbles)?
3.  **Scaffolding**:
    - Create the directory structure.
    - Create the skeleton files with defined interfaces.
    - // turbo
    - `npm run type-check` (to ensure the interfaces are valid).
4.  **Core Logic (The "Brain")**:
    - Implement the backend/LangGraph logic first.
    - If RAG is involved, verify the retrieval pipeline.
5.  **UI Implementation (The "Face")**:
    - Implement the Frontend components using `shadcn/ui`.
    - Apply Tailwind classes strictly from [design_fe.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/design/design_fe.md:0:0-0:0) (e.g., `text-slate-900`, `max-w-prose`).
6.  **Verification & Cleanup**:
    - **Automated:** Run `npm run lint` to catch stylistic errors.
    - **Manual:** Verify the feature against the "Success Metrics" in the PRD.
    - **Documentation:** Update [context/tech_arcitecture.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/tech_arcitecture.md:0:0-0:0) if this feature changed the system structure.