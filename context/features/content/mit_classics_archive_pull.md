# Feature Spec: Internet Classics Archive (MIT) Scraper

## 1. Objective
Develop a Python-based web crawler to systematically traverse `classics.mit.edu`, identify all available works, and download the "Text-Only" (`.txt`) versions. If a text-only version is unavailable, the script must parse the HTML content of the work's sub-pages.

## 2. Target Site Architecture
* **Root Index:** `http://classics.mit.edu/Browse/index.html` (List of Authors)
* **Author Page:** `http://classics.mit.edu/Browse/browse-[Author].html` (List of Works)
* **Work Page:** `http://classics.mit.edu/[Author]/[Work].html`
    * *Golden Path:* Look for a link labeled "text-only version" or "Download".
    * *Fallback Path:* The work is split into `[Work].1.i.html`, `[Work].2.ii.html`, etc.

## 3. Functional Requirements

### 3.1 Traversal Logic
1.  **Catalog Generation:**
    * Scrape the Root Index to build a list of all 59 Authors.
    * Visit each Author Page to build a `work_queue` of all 441 titles.
2.  **Download Strategy (Priority Queue):**
    * **Attempt A (The Text File):** For each work, inspect the landing page for a `.txt` file link (often hidden in the header text like "A 50k text-only version is available").
    * **Attempt B (The HTML Parse):** If no `.txt` exists, crawl the "Table of Contents" links (Book I, Book II, etc.). Extract text from `<p>` tags, discarding navigation tables and footers.

### 3.2 Data Structuring
* **Output Path:** `data/mit_classics/[Author]/[Title].txt`
* **Metadata Header:** Prepend a JSON formatted header to each file:
    ```json
    {
      "title": "The Republic",
      "author": "Plato",
      "translator": "Benjamin Jowett",
      "date": "360 B.C.E",
      "source_url": "[http://classics.mit.edu/Plato/republic.html](http://classics.mit.edu/Plato/republic.html)"
    }
    ```

### 3.3 Rate Limiting & Ethics
* **Delay:** Enforce a `time.sleep(1.0)` between requests to respect the legacy MIT servers.
* **User-Agent:** Set a custom User-Agent string: `Sophia-Philosophy-Agent/0.1 (bot; contact: [your-email])`.

## 4. Technical Stack
* **Language:** Python 3.10+
* **Libraries:**
    * `requests` (HTTP handling)
    * `BeautifulSoup4` (HTML parsing)
    * `slugify` (Sanitizing filenames)

## 5. Antigravity Tasking Instructions
* **Manager:** Monitor the `work_queue` size (expected: 441 items).
* **Editor:** Write `scrape_mit_classics.py`. Implement a "retry" decorator for network timeouts.
* **Browser:** Manually inspect 3 random works (e.g., *The Iliad*, *The Apology*) to identify the CSS selector for the "Download" link.

## 6. Constraints
* **Encoding:** Ensure all files are saved as `UTF-8`. The original site may use `ISO-8859-1` or `Windows-1252`; the script must transcode this.
* **Error Handling:** Log failed downloads to `missed_works.log` for manual review.