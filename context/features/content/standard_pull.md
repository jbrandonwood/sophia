# Feature Spec: Standard Ebooks Philosophical Corpus Extractor

## 1. Overview
A high-precision data ingestion tool to scrape, filter, and structure the philosophy and ethics catalog from StandardEbooks.org. This tool targets the "Advanced" versions of public domain texts which have been manually cleaned of OCR errors.

## 2. Technical Goals
* **Targeted Subject Filtering:** Programmatically filter the library using Standard Ebooks' internal categories (e.g., `Philosophy`, `Non-fiction`, `Ethics`).
* **Source-to-JSONL Pipeline:** Transform XHTML/EPUB source files into structured JSONL format for embedding.
* **Metadata Preservation:** Capture the "Word Count" and "Difficulty" levels to allow the AI agent to choose simpler texts for beginners and denser texts for experts.

## 3. Data Source Architecture
Standard Ebooks provides a **Bulk Download** or a **Public Git Repository** for every book.
* **Base URL:** `https://standardebooks.org/ebooks/`
* **Subject URL:** `https://standardebooks.org/ebooks?subjects[]=philosophy`
* **Format Target:** `.azw3` or `.epub` (Both are essentially zipped XHTML).

## 4. Functional Requirements

### 4.1 Discovery Module
* **Scraper:** Crawl the "Philosophy" and "Ethics" subject pages.
* **Deduplication:** Check against the existing dataset. If a title exists in both, **prioritize Standard Ebooks** due to superior formatting.

### 4.2 Extraction & Transformation (The "Parser")
* **XHTML Parsing:** Use `BeautifulSoup` to target specific tags. 
    * Standard Ebooks uses semantic HTML5 tags like `<section epub:type="chapter">`. This allows us to extract chapters with 100% precision without complex regex.
* **Header/Footer Removal:** Automatically discard the `titlepage.xhtml`, `colophon.xhtml`, and `uncopyright.xhtml`.

### 4.3 Output Schema
The final output must be a `.jsonl` file where each line is an object:
```json
{
  "source": "Standard Ebooks",
  "slug": "plato_the-republic_benjamin-jowett",
  "text_content": "[CLEAN CHAPTER TEXT]",
  "metadata": {
    "author": "Plato",
    "title": "The Republic",
    "subject": ["Philosophy", "Ethics", "Politics"],
    "reading_ease": "45.2",
    "word_count": 112000
  }
}
```
## 5. Implementation roadmap
Phase	Task	First Principles Focus
I: Crawler	Use Requests + lxml to map the Philosophy subject list.	Efficiency: Cache the list locally to avoid repeated hits to their servers.
II: Downloader	Pull the epub files for all identified slugs.	Integrity: Verify file hashes to ensure no corruption during transit.
III: Extraction	Parse the OEBPS folder in the EPUB to extract individual chapters.	Context: Retain the chapter titles as headers to help the embedding model.
IV: Cleaning	Strip the "Standard Ebooks" boilerplate.	Compliance: Ensure the resultant dataset is pure public domain text.

## 6. Success Metrics
* Accuracy: 100% of the Philosophy bookshelf on Standard Ebooks is downloaded.
* Structure: Chapters are stored as discrete units (perfect for "Late Chunking" or "Parent-Child" RAG).
* Speed: Full library ingestion (approx. 200–300 books) should take <10 minutes.

