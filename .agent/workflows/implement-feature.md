---
description: Turn a finalized Feature Spec into code (Implementation Phase)
---

1.  **Spec Ingestion**:
    - **Action**: You must have a specific target spec (e.g., `context/specs/[feature].md`).
    - **Read**: Read the target spec file.
    - **Read**: Read [context/tech_arcitecture.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/tech_arcitecture.md:0:0-0:0) (to ensure structural alignment).
    - **Read**: Read [context/design/design_fe.md](cci:7://file:///Users/brandonwood/Desktop/sophia/context/design/design_fe.md:0:0-0:0) (to align with the "Digital Stoa" aesthetic).
2.  **Plan Update**:
    - **Action**: Update `implementation_plan.md` to reflect the specific tasks in the Spec.
    - **Check**: Ensure the plan references the *exact* filenames and component names defined in the Spec.
3.  **Type-First Scaffolding (Critical Step)**:
    - **Reference**: Look at Section `3.1 Data Model` in the Spec.
    - **Action**: Create/Update the TypeScript interfaces (`types/*.ts` or `lib/*.ts`) *before* writing any logic.
    - **Command**: Run `npm run type-check` to verify the new types are valid.
4.  **Backend/Logic Implementation**:
    - **Reference**: Look at Section `3.2 Logic & Algorithms` in the Spec.
    - **Action**: Implement the core logic (LangGraph nodes, API routes, or Hook logic).
    - **Constraint**: Add JSDoc comments to all new exported functions (per Rule 4).
5.  **UI Implementation**:
    - **Reference**: Look at Section `2. User Flow & UI`.
    - **Action**: Build the components using `shadcn/ui`.
    - **Constraint**: Strict adherence to Tailwind v4 and the "No Chat Bubble" rule.
6.  **Verification**:
    - **Reference**: Look at Section `5. Verification Plan` in the Spec.
    - **Action**: Verify the "Happy Path" and "Edge Case" described in the spec.
    - **Action**: Run `npm run lint` and `npm run build` to ensure no regressions.