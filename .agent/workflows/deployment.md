---
description: Sync with GitHub and deploy the Next.js application to Google Cloud Run
---

### Deployment Workflow: Sophia (Digital Stoa)

This workflow ensures the latest Socratic logic is synchronized with GitHub and deployed to Google Cloud Run.

#### 1. Pre-Deployment Check
Run local verification to ensure zero lint errors and successful compilation.
```bash
cd web
npm run lint && npm run build
```

#### 2. Git Sync (GitHub MCP)
// turbo
**IMPORTANT**: Use the GitHub MCP `push_files` tool to synchronize local changes. This is more reliable for large batches of files.
1. Stage all relevant files.
2. Commit with a descriptive message (e.g., `feat: resolve ontological drift in analyst node`).
3. Push to `main`.
*Note: If local Git is available, you can alternatively use `git push origin main`.*

#### 3. Documentation Audit
Ensure all architecture changes are reflected in `/context/agent-system.md` and appropriate `README.md` files.

#### 4. Cloud Run Deployment
The GitHub Actions pipeline will automatically trigger upon push to `main`. 
Monitor progress here: [GitHub Actions Logs](https://github.com/jbrandonwood/sophia/actions)

#### 5. Verification
Once the build is complete:
1. Access the production URL.
2. Verify the "Internal Traces" page for data consistency.
3. Test a new Socratic inquiry to ensure the LangGraph state machine is healthy.
