# Feature Spec: Antigravity Vertex AI Integration (Auto-Chunking Strategy)

## 1. Overview
This module ("Antigravity") manages the provisioning and synchronization of the Sophia Knowledge Base. It uploads the raw, normalized `master_corpus_deduplicated.jsonl` to Google Cloud and instructs Vertex AI Search to automatically segment the text into retrievable chunks while preserving document-level metadata for citations.

## 2. Technical Goals
* **Infrastructure-as-Code:** Automate the creation of the GCS Bucket and Vertex AI Data Store.
* **Native Auto-Chunking:** Leverage Vertex AI's "Digital Parser" to split long philosophical texts into semantically relevant segments (approx. 500-1000 tokens).
* **Grounding Optimization:** Configure the index to support "Enterprise Edition" features (Extractive Answers + Citations).

## 3. Infrastructure Configuration

### 3.1 Storage Layer (GCS)
* **Bucket:** `sophia-corpus-production` (Region: `us-central1`)
* **Object:** `data/master_corpus.jsonl`
* **Lifecycle Rule:** Standard storage (no auto-deletion).

### 3.2 Vertex AI Data Store Settings
* **Display Name:** `Sophia Philosophical Knowledge Base`
* **Data Store ID:** `sophia-kb-v1`
* **Solution Type:** `Chat and Search`
* **Content Config:** `Unstructured data with metadata`
* **Source:** `Cloud Storage` (JSONL format)

## 4. Ingestion & Chunking Logic

### 4.1 The "Document Processing" Config
When Antigravity initiates the import via `Method: projects.locations.collections.dataStores.importDocuments`, it must apply a specific **Chunking Configuration** to handle the philosophy texts effectively.

**Configuration Parameters:**
* **`chunkingConfig`:**
    * `layoutBasedChunking`: **Enabled** (Uses document structure to respect paragraph boundaries).
    * `chunkSize`: **1000 Tokens** (Higher than default 500 to capture full philosophical premises).
    * `chunkOverlap`: **200 Tokens** (To ensure context isn't lost at the seam of a split).

### 4.2 Handling Large Payloads (The "Plutarch Risk")
* **Constraint:** Vertex AI Search has a maximum file size limit for ingestion (typically 25MB for pure text).
* **Pre-Flight Check:** Before upload, Antigravity runs a size check on every line in the JSONL.
    * *Action:* If a single record > 20MB, split it into `Part 1`, `Part 2` at the nearest newline to avoid ingestion failure.
    * *Metadata update:* Mark split records with `section_part: "1/2"`.

## 5. Schema Mapping
Vertex AI will automatically parse the JSONL. Antigravity verifies these field mappings are set to **"Indexable"** and **"Searchable"**:

| JSON Field | Vertex Attribute | Purpose |
| :--- | :--- | :--- |
| `text` | `content` | **Vector Target** (The text Google chunks & embeds) |
| `title` | `title` | Citation Display |
| `url` | `uri` | Link to source (if available) |
| `author` | `structData.author` | Filter (e.g., `filter=author:Plato`) |
| `source` | `structData.source` | Filter (e.g., `filter=source:Perseus`) |
| `uuid` | `id` | Deduplication Key |

## 6. Runtime Integration (Gemini 3.0)

### 6.1 The Retrieval Tool
Antigravity exposes a specific tool definition for the Gemini System Prompt:

```json
{
  "google_vertex_ai_search": {
    "data_store_id": "sophia-kb-v1",
    "serving_config": "default_search",
    "retrieval_mode": "EXTRACTIVE_SEGMENTS" 
  }
}
```
* Logic: EXTRACTIVE_SEGMENTS is critical. It forces Vertex to return the specific sentences that answer the query, allowing Gemini to cite them directly, rather than just returning a generic document link.

## 7. Operational Workflow (CLI Commands)
* antigravity init:
    * Creates gs://sophia-corpus-production.
    * Enables discoveryengine.googleapis.com.
* antigravity sync:
    * Validates master_corpus_deduplicated.jsonl (checks for >20MB outliers).
    * Uploads file to GCS.
    * Triggers importDocuments with auto-chunking enabled.
* antigravity status:
    * Polls the Operation API to check indexing progress (Success/Failure count).

## 8. Success Metrics
* Ingestion Success Rate: > 99.5% of records indexed successfully.
* Chunk Fidelity: Search queries return segments that respect sentence boundaries (no mid-sentence cuts).
* Citation Availability: Test queries ("What is Justice?") return response objects containing citations metadata.