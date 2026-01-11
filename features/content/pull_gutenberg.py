import gutenbergpy.textget
import gutenbergpy.gutenbergcache
import os
import json
import logging
import sqlite3
import ssl

# Hack to bypass SSL verification errors for Gutenberg RDF download
ssl._create_default_https_context = ssl._create_unverified_context

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "gutenberg")
CACHE_FILE = "gutenberg_index.db"

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

import glob
import xml.etree.ElementTree as ET

CACHE_DIR = "cache/epub"
NS = {
    'pgterms': 'http://www.gutenberg.org/2009/pgterms/',
    'dcterms': 'http://purl.org/dc/terms/',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'dcam': 'http://purl.org/dc/dcam/'
}

def parse_rdf(filepath):
    """Parses a single RDF file and returns dict if it matches philosophy criteria."""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Check Language
        lang = "unknown"
        lang_tag = root.find(".//dcterms:language/rdf:Description/rdf:value", NS)
        if lang_tag is not None:
            lang = lang_tag.text
            
        if lang != 'en':
            return None
            
        # Check Subjects
        subjects = []
        for subj in root.findall(".//dcterms:subject/rdf:Description/rdf:value", NS):
            if subj.text:
                subjects.append(subj.text)
        
        # Filter Logic
        relevant = False
        target_subject = ""
        for s in subjects:
            s_lower = s.lower()
            if 'philosophy' in s_lower or 'ethics' in s_lower or 'logic' in s_lower or 'psychology' in s_lower:
                relevant = True
                target_subject = s
                break
        
        if not relevant:
            return None
            
        # Extract Title
        title_tag = root.find(".//dcterms:title", NS)
        title = title_tag.text if title_tag is not None else "Unknown Title"
        
        # Extract Author
        author_tag = root.find(".//dcterms:creator/pgterms:agent/pgterms:name", NS)
        author = author_tag.text if author_tag is not None else "Unknown Author"
        
        # Extract ID (from filename or rdf:about)
        # Filepath is cache/epub/1234/pg1234.rdf -> 1234
        g_id = os.path.basename(os.path.dirname(filepath))
        
        # Calculate download count (proxy for quality/popularity)
        downloads = 0
        dl_tag = root.find(".//pgterms:downloads", NS)
        if dl_tag is not None:
             downloads = int(dl_tag.text)
        
        return {
            "id": int(g_id),
            "title": title,
            "author": author,
            "subject": target_subject,
            "downloads": downloads
        }
        
    except Exception as e:
        # logging.warning(f"Error parsing {filepath}: {e}")
        return None

def query_philosophy_books():
    """Manually scans extracted RDFs for philosophy books."""
    logging.info("Scanning RDF files (Custom Indexing)...")
    
    books = []
    # Use glob to find all rdf files
    # The structure is cache/epub/ID/pgID.rdf
    rdf_files = glob.glob(os.path.join(CACHE_DIR, "**/*.rdf"), recursive=True)
    
    logging.info(f"Found {len(rdf_files)} RDF files. Parsing...")
    
    count = 0
    for f in rdf_files:
        book = parse_rdf(f)
        if book:
            books.append(book)
        
        count += 1
        if count % 2000 == 0:
            logging.info(f"Scanned {count} files...")

    # Sort by downloads descending
    books.sort(key=lambda x: x['downloads'], reverse=True)
    
    logging.info(f"Found {len(books)} relevant philosophy books.")
    
    # Return all books
    return books

def download_and_save(book):
    book_id = book['id']
    title = book['title']
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip().replace(" ", "_")
    output_dir = os.path.join(DATA_DIR, "General_Philosophy") # Naive grouping for now
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, f"{safe_title}_{book_id}.txt")
    
    if os.path.exists(output_path):
        logging.info(f"Skipping {title}, already exists.")
        return

    logging.info(f"Downloading {title} ({book_id})...")
    
    try:
        # Download
        raw_bytes = gutenbergpy.textget.get_text_by_id(book_id)
        # Clean
        clean_bytes = gutenbergpy.textget.strip_headers(raw_bytes)
        text_content = clean_bytes.decode("utf-8", errors="ignore")
        
        # Metadata Header
        meta = {
            "title": title,
            "author": book['author'],
            "source": f"Project Gutenberg ID {book_id}",
            "subject": book['subject']
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(meta, indent=2))
            f.write("\n\n")
            f.write(text_content)
            
        logging.info(f"Saved {title}")
        
    except Exception as e:
        logging.error(f"Failed to process {title}: {e}")

def main():
    logging.info("Starting Gutenberg Pull...")
    # ensure_cache() - Disabled in favor of custom indexing
    
    books = query_philosophy_books()
    
    for book in books:
        download_and_save(book)

if __name__ == "__main__":
    main()
