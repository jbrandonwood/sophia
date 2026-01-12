---
description: Audit and upgrade code documentation and comments
---

1.  **Public API Scan**:
    - Identify all **exported** functions and interfaces in `lib/` and `hooks/`.
    - Check if they have JSDoc (`/** ... */`) blocks.
    - **Action:** If missing, generate JSDoc based on the type signature.
2.  **Complexity Audit**:
    - Identify "Magic Logic" (e.g., complex Regex, LangGraph state reducers, or recursive functions).
    - **Action:** Add a `// NOTE: [Explanation]` comment explaining the *strategy* of the algorithm for a junior engineer.
3.  **Directory Mapping**:
    - Check major directories (`app`, `lib`, `components`, `ag_agent`, `pipelines`).
    - **Action:** Ensure a `README.md` exists in the root of these folders summarizing their contents.
    - *Tip: A 3-line README is infinitely better than no README.*
4.  **TODO Cleanup**:
    - `grep -r "TODO" .`
    - **Action:** Convert valid TODOs into GitHub Issues (or `task.md` entries) and delete the comment. Delete stale TODOs.