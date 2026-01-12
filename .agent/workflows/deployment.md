---
description: Sync with GitHub and deploy the Next.js application to Google Cloud Run
---

1. **Pre-Flight Check**:
   - Run `npm run lint` and `npm run build` locally to catch compilation errors.
2. **Git Sync**:
   - Ensure the local codebase is versioned and synced.
   - `git add .`
   - `git commit -m "deploy: manual production update"`
   - `git push origin main`
   - *Note: Since you have a GitOps architecture, this push might also trigger your GitHub Actions pipeline. This workflow serves as a manual override/confirmation.*
3. **Docker Build**:
   - Build the container image.
   - `docker build -t gcr.io/[PROJECT_ID]/sophia-web:latest .`
4. **Push to Registry**:
   - `docker push gcr.io/[PROJECT_ID]/sophia-web:latest`
5. **Deploy Service**:
   - Deploy to Cloud Run using the `gcloud` CLI.
   - // turbo
   - `gcloud run deploy sophia-web --image gcr.io/[PROJECT_ID]/sophia-web:latest --region us-central1 --allow-unauthenticated`
6. **Smoke Test**:
   - Visit the Service URL.
   - Verify the "Digital Stoa" styling loads correctly.
   - Perform one "Socratic Turn" to verify Vertex AI connectivity.