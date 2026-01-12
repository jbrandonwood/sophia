---
description: Perform deep cleaning, formatting, and documentation synchronization
---

1.  **Strict Linting & Formatting**:
    - **Frontend:** Run `npm run lint --fix` and `npx prettier --write .` to enforce the "Visual Stoa" (clean code).
    - **Backend (Python):** Run `ruff check . --fix` and `black .` to standardize python scripts.
    - *Why: Eliminates "style nitpicks" from code reviews entirely.*
2.  **Type Integrity Check**:
    - **Frontend:** Run `tsc --noEmit` to catch any "silent" type errors that haven't broken the build yet but will confuse a new developer.
    - **Goal:** Zero `any` types (per User Rules).
3.  **Zombie Code Hunting**:
    - Identify and delete large blocks of commented-out code.
    - *Why: Commented code is history. Use Git for history; keep the main branch for the present.*
4.  **Component Audit (The "Dry Run")**:
    - Check `components/ui`. Are there unused Shadcn primitives?
    - Check `app/`. Are there "test pages" or "tmp routes" left over from debugging?
    - Move them to `_archive/` or delete them.
    - npx knip to find dead files and delete them.
5.  **Sync Documentation**:
    - Run `tree -L 2 -I 'node_modules|.git|.next|venv'` to get a fresh view of the structure.
    - Update the "Directory Structure" section in `README.md` to reflect reality.
    - *Why: A new developer's first question is always "Where does X live?" The README must answer this correctly.*