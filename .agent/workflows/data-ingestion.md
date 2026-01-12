---
description: Process and sync new philosophical texts to Vertex AI
---

1. **Validation**: Check the source file format.
   - Files must be strictly `.jsonl`.
   - Schema: `{ "id": string, "text": string, "metadata": { "author": string, "title": string, "chapter": string } }`.
   - Run `wc -l [filename]` to verify record count.
2. **Deduplication & Sanitization**:
   - Ensure no duplicate segments exist using the hash utility.
   - Verify encoding is UTF-8.
3. **Upload to Storage**:
   - Use `gsutil` or Python script to upload to the production bucket.
   - Target: `gs://sophia-corpus-production/v1/`
   
4. **Trigger Vertex Sync**:
   - Run the antigravity sync command (or `gcloud` equivalent).
   - `gcloud gen-ai-search data-stores import ...`
   
5. **Verify**:
   - Check the Vertex AI console for ingestion errors/warnings.