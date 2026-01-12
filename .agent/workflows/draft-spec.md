---
description: Collaboratively draft a rigorous Feature Spec with the Agent
---

1.  **Context Preparation**:
    - Read [context/prd.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/prd.md:0:0-0:0) to ground the feature in the product vision.
    - Read [context/tech_arcitecture.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/tech_arcitecture.md:0:0-0:0) to identify technical constraints.
    - Read [context/design/design_fe.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/design/design_fe.md:0:0-0:0) to ensure UI alignment.
2.  **The Interview (Socratic Elicitation)**:
    - **Goal:** Transform a "vague idea" into a "structured requirement."
    - **Action:** Ask the user specific questions about:
        - **Data:** "What specific fields do we need to store? What is the relation to the existing schema?"
        - **UI:** "Walk me through the user interaction step-by-step. What happens on error?"
        - **Edge Cases:** "What if the user is offline? What if the text is 10,000 words long?"
    - *Repeat this step until sufficient detail is gathered.*
3.  **Drafting the Spec**:
    - Create a new file `context/specs/[feature_name].md`.
    - Apply the **Antigravity Feature Spec Template**.
    - Fill in sections based on the interview data.
    - **Crucial:** Define the *likely* TypeScript interfaces in the `Technical Implementation` section now.
4.  **Critique & Refine**:
    - **Self-Correction:** Check the draft against [context/tech_arcitecture.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/tech_arcitecture.md:0:0-0:0). Does it violate any constraints (e.g., "No Chat Bubbles")?
    - **User Review:** Present the draft to the user for sign-off.
5.  **Finalize**:
    - Save the file.
    - Ask the user: "Are we ready to switch to the `feature-dev` workflow to build this?"