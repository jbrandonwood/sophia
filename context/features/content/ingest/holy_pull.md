# Feature Spec: Sacred-Texts (ISTA) Corpus Ingestor

## 1. Overview
A specialized web-crawling and transformation agent designed to reconstruct the fragmented HTML structure of sacred-texts.com into a unified JSONL dataset. This tool prioritizes reconstructing document hierarchy (Books -> Chapters -> Verses) that is otherwise lost in basic web scraping.

## 2. Technical Objectives
* **Deep Fragmentation Reassembly:** Handle the "Short-File" problem by traversing index pages and stitching thousands of sub-pages into single "Work" objects.
* **Semantic Tag Extraction:** Preserve specific ISTA markers (e.g., `<center>` tags for verse numbers or `<i>` for scholarly commentary) to differentiate primary text from metadata.
* **Dynamic Breadcrumb Mapping:** Use the site's folder structure (e.g., `/hin/sbe/` for Hinduism) to automatically categorize the "Tradition" and "School" of the work.

## 3. Scraping Strategy & Rules
* **Seed URLs:** Start at the primary topical index: `https://sacred-texts.com/world.htm`.
* **Politeness & Rate Limiting:** * The site is a non-profit resource. 
    * Limit to **1 request per 3 seconds**.
    * Implement a "Crawl-Pause" every 100 pages to avoid server strain.
* **Target Format:** Identify links ending in `.htm` or `.txt`. Prioritize `.txt` versions (available for newer entries) to bypass HTML parsing entirely.

## 4. Functional Requirements

### 4.1 The "Stitcher" Module
* **Logic:** When the crawler hits an index page (e.g., `/bib/os/index.htm`), it must follow all sequential sub-links, extract the text, and append it into a single logical "Parent" entry.
* **Context Preservation:** Every chunk must retain a `source_url` and a `sequence_index` to ensure the AI understands the linear flow of the scripture.

### 4.2 Metadata Extraction Spec
For every text block, extract the following ISTA-specific fields:
* `tradition`: (e.g., "Buddhism", "Occult", "Americana")
* `language`: (Captured from the ISO codes often used in their subfolders like `/fre/` or `/lat/`).
* `translator`: Extracted from the `<title>` tag or the first `<p>` of the index page.

---

## 5. Preprocessing & Data Cleaning
* **ASCII Art Removal:** Many ISTA texts contain ASCII borders or headers (e.g., `====================`). Use a regex filter to purge these.
* **Footnote Anchoring:** ISTA uses unique anchors (e.g., `[1:2]`). The cleaner should convert these into a standard `footnotes` array in the JSONL object rather than leaving them inline.

## 6. Output Schema (JSONL)
```json
{
  "source": "Internet Sacred Text Archive",
  "path": "bib/cv/cv01.htm",
  "metadata": {
    "title": "The Codex Vercellensis",
    "tradition": "Christianity",
    "section": "Introductory Note",
    "sequence_id": 1
  },
  "content": "The original text of the fragment...",
  "footnotes": [
    {"ref": "1", "text": "Latin: Vercelli Codex"}
  ]
}
```
## 7. Operational Constraints
* **IP Rights:** All works on ISTA are in the public domain or used with permission for non-commercial study. The script must ignore any /private/ or /restricted/ directories if they appear.
* **Deduplication:** Check the Master Manifest. If a better version of a text (e.g., The Bhagavad Gita) exists in Standard Ebooks, discard the ISTA HTML version to save on vector costs.