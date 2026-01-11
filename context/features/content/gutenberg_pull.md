# Feature Spec: Gutenberg Philosophy Data Extractor

## 1. Overview
A backend utility to automate the creation of a high-quality "Ancient & Classical Wisdom" dataset. The tool will crawl the Project Gutenberg metadata, filter for specific philosophical genres, and download clean text files for LLM training/RAG.

## 2. Technical Goals
* **Targeted Extraction:** Filter by Library of Congress Subject Headings (LCSH) for 'Philosophy', 'Ethics', and 'Psychology'.
* **Noise Reduction:** Automatically strip Project Gutenberg headers/footers (IP/Legal boilerplate) to ensure the model only learns primary source material.
* **Data Integrity:** Save metadata (Author, Title, Year, LCSH) alongside the text for RAG-source attribution.

## 3. Scope & Filtering Logic
The scraper will target the following LCSH strings:
* `B`: Philosophy (General)
* `BC`: Logic
* `BD`: Speculative Philosophy
* `BJ`: Ethics
* `BF`: Psychology

## 4. Functional Requirements

### 4.1 Metadata Retrieval
* Utilize the `Gutenberg-dammit` or `rdflib` library to parse the Project Gutenberg RDF catalog.
* Filter for English language works only (initial version).

### 4.2 Content Cleaning Pipeline
* **Header/Footer Stripping:** Identify the start/end markers (e.g., `*** START OF THIS PROJECT GUTENBERG EBOOK... ***`) and discard all text outside these boundaries.
* **Unicode Normalization:** Convert "curly quotes" and special characters to standard UTF-8.

### 4.3 Output Structure
Files should be stored in a flat directory or a SQLite database with the following schema:
* `id`: Gutenberg ID (e.g., 158)
* `title`: "The Republic"
* `author`: "Plato"
* `category`: "Philosophy/Ethics"
* `raw_text`: [CLEANED TEXT CONTENT]

## 5. Proposed Technology Stack
* **Language:** Python 3.10+
* **Libraries:** * `GutenbergPy`: For downloading and initial cleaning.
    * `NLTK` or `Spacy`: For basic sentence tokenization during the cleaning phase.
    * `Pandas`: For managing the metadata manifest.

## 6. Success Metrics
* **Recall:** Successfully identifies >90% of philosophical works listed in the Gutenberg "Philosophy" bookshelf.
* **Cleanliness:** Zero Project Gutenberg legal boilerplate present in the `raw_text` output.