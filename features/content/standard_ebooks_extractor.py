import requests
from bs4 import BeautifulSoup
import os
import json
import logging
import time
import zipfile
import re
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://standardebooks.org"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "standard_ebooks")
CATALOG_PATH = os.path.join(DATA_DIR, "catalog.json")
EPUBS_DIR = os.path.join(DATA_DIR, "epubs")
OUTPUT_FILE = os.path.join(DATA_DIR, "philosophy_corpus.jsonl")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("standard_ebooks_scraper.log"),
        logging.StreamHandler()
    ]
)

class StandardEbooksExtractor:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(EPUBS_DIR, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Sophia-Philosophy-Agent/0.1 (bot; contact: admin@sophia.dev)"
        })

    def run_crawler(self):
        """Phase I: Crawl subject pages and build a catalog."""
        logging.info("Phase I: Starting Crawler...")
        
        subjects = ["philosophy", "ethics"]
        catalog_dict = {} # Key by slug to deduplicate
        
        for subject in subjects:
            logging.info(f"Crawling subject: {subject}...")
            # Note: The URL is https://standardebooks.org/subjects/{subject}
            current_url = f"{BASE_URL}/subjects/{subject}"
            page_num = 1
            
            while current_url:
                logging.info(f"Fetching page {page_num} for {subject}: {current_url}...")
                try:
                    response = self.session.get(current_url)
                    response.raise_for_status()
                except Exception as e:
                    logging.error(f"Failed to fetch {current_url}: {e}")
                    break

                soup = BeautifulSoup(response.text, "html.parser")
                
                ebook_items = soup.select("ol.ebooks-list li")
                
                for li in ebook_items:
                    try:
                        # Get all anchors
                        anchors = li.find_all("a", href=True)
                        if not anchors:
                            continue
                            
                        # The main link is usually the one with property="schema:url" inside a p
                        href = None
                        for a in anchors:
                            h = a['href']
                            if h.startswith("/ebooks/") and not h.startswith("/ebooks/?"):
                                 href = h
                                 break
                        
                        if not href:
                            continue

                        # Title
                        spans = li.find_all("span", property="schema:name")
                        book_title = "Unknown"
                        book_author = "Unknown"
                        
                        if len(spans) > 0:
                            book_title = spans[0].get_text(strip=True)
                        
                        # Author
                        author_p = li.find("p", class_="author")
                        if author_p:
                            auth_name_span = author_p.find("span", property="schema:name")
                            if auth_name_span:
                                book_author = auth_name_span.get_text(strip=True)
                            else:
                                book_author = author_p.get_text(strip=True)

                        slug = href.strip("/").replace("/", "_")
                        details_url = urljoin(BASE_URL, href)
                        
                        # Check if already processed
                        if slug in catalog_dict:
                            if subject.capitalize() not in catalog_dict[slug]["subjects"]:
                                catalog_dict[slug]["subjects"].append(subject.capitalize())
                            continue

                        # Fetch Details Page
                        logging.info(f"Fetching details for {book_title}...")
                        time.sleep(1) # Be polite
                        try:
                            det_resp = self.session.get(details_url)
                            det_resp.raise_for_status()
                            det_soup = BeautifulSoup(det_resp.text, "html.parser")
                            
                            meta_text = det_soup.get_text(" ", strip=True)
                            
                            reading_ease = None
                            difficulty = None
                            source_word_count = None
                            
                            match = re.search(r'([\d,]+)\s+words.*?reading ease of\s+([\d\.]+)\s*\((.*?)\)', meta_text, re.IGNORECASE)
                            if match:
                                source_word_count = int(match.group(1).replace(",", ""))
                                reading_ease = float(match.group(2))
                                difficulty = match.group(3)
                            
                        except Exception as e:
                            logging.warning(f"Failed to fetch details for {slug}: {e}")
                            reading_ease = None
                            difficulty = None
                            source_word_count = None

                        parts = href.strip("/").split("/")
                        if len(parts) > 1 and parts[0] == 'ebooks':
                            filename_base = "_".join(parts[1:])
                            epub_url = f"{BASE_URL}{href}/downloads/{filename_base}.epub?source=download"

                            entry = {
                                "slug": slug,
                                "title": book_title,
                                "author": book_author,
                                "subjects": [subject.capitalize()],
                                "details_url": details_url,
                                "epub_url": epub_url,
                                "filename_base": filename_base,
                                "reading_ease": reading_ease,
                                "difficulty": difficulty,
                                "source_word_count": source_word_count
                            }
                            catalog_dict[slug] = entry
                            logging.info(f"Found: {book_title} ({difficulty})")
                    except Exception as e:
                        logging.warning(f"Error parsing item: {e}")
                
                # Check for next page
                next_link = soup.find("a", attrs={"rel": "next"})
                if next_link and next_link.get("href"):
                    next_href = next_link.get("href")
                    current_url = urljoin(BASE_URL, next_href)
                    page_num += 1
                    time.sleep(1)
                else:
                    current_url = None

        catalog = list(catalog_dict.values())
        logging.info(f"Phase I Complete. Found {len(catalog)} unique books.")
        
        with open(CATALOG_PATH, "w") as f:
            json.dump(catalog, f, indent=2)
            
        return catalog

    def run_downloader(self, catalog):
        """Phase II: Download epubs."""
        logging.info("Phase II: Starting Downloader...")
        
        for book in catalog:
            epub_url = book['epub_url']
            filename = f"{book['filename_base']}.epub"
            filepath = os.path.join(EPUBS_DIR, filename)
            
            if os.path.exists(filepath):
                logging.info(f"Skipping {filename}, already exists.")
                continue
            
            logging.info(f"Downloading {book['title']}...")
            try:
                time.sleep(1) 
                
                resp = self.session.get(epub_url, stream=True)
                if resp.status_code == 200:
                    with open(filepath, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=8192):
                            f.write(chunk)
                    logging.info(f"Downloaded {filename}")
                else:
                    logging.error(f"Failed to download {epub_url}: Status {resp.status_code}")
            except Exception as e:
                logging.error(f"Error downloading {epub_url}: {e}")

        logging.info("Phase II Complete.")

    def run_extractor(self):
        """Phase III: Extract text from epubs."""
        logging.info("Phase III: Starting Extractor...")
        
        output_rows = []
        
        # Load catalog to map filename back to metadata
        if not os.path.exists(CATALOG_PATH):
             logging.error("No catalog found. Run Phase I first.")
             return

        with open(CATALOG_PATH, "r") as f:
            catalog = json.load(f)
            
        # Map filename_base -> book entry
        catalog_map = {b['filename_base']: b for b in catalog}
        
        epub_files = [f for f in os.listdir(EPUBS_DIR) if f.endswith(".epub")]
        
        for epub_file in epub_files:
            filename_base = epub_file.replace(".epub", "")
            book_meta = catalog_map.get(filename_base, {})
            
            epub_path = os.path.join(EPUBS_DIR, epub_file)
            logging.info(f"Processing {epub_file}...")
            
            try:
                with zipfile.ZipFile(epub_path, 'r') as z:
                    # Find content.opf to identify reading order
                    # It's usually in OEBPS/content.opf or similar.
                    # We need to find it by looking for container.xml or scanning files.
                    
                    # Simple scan for .opf
                    opf_files = [n for n in z.namelist() if n.endswith(".opf")]
                    if not opf_files:
                        logging.warning(f"No OPF file found in {epub_file}")
                        continue
                        
                    opf_path = opf_files[0]
                    opf_content = z.read(opf_path).decode('utf-8')
                    opf_soup = BeautifulSoup(opf_content, "html.parser")
                    
                    # Get the spine
                    spine = opf_soup.find("spine")
                    manifest = opf_soup.find("manifest")
                    
                    if not spine or not manifest:
                        logging.warning(f"Invalid OPF in {epub_file}")
                        continue
                        
                    # Map id to href reference
                    id_href_map = {}
                    for item in manifest.find_all("item"):
                        id_href_map[item.get("id")] = item.get("href")
                        
                    # Extract text from linear items
                    full_text = []
                    
                    # resolve relative path of opf
                    opf_dir = os.path.dirname(opf_path)
                    
                    for itemref in spine.find_all("itemref"):
                        idref = itemref.get("idref")
                        href = id_href_map.get(idref)
                        
                        if not href:
                            continue
                            
                        # Standard Ebooks specific: Skip cover, titlepage, imprint, uncopyright, colophon
                        if any(x in href for x in ["cover", "titlepage", "imprint", "uncopyright", "colophon", "toc"]):
                            continue
                            
                        # Full path in zip
                        file_path_in_zip = os.path.join(opf_dir, href) if opf_dir else href
                        
                        try:
                            content = z.read(file_path_in_zip).decode('utf-8')
                            soup = BeautifulSoup(content, "html.parser")
                            
                            # Extract text
                            # Improve: target <section epub:type="chapter"> or simply <body>
                            body = soup.find("body")
                            if body:
                                # Remove page numbers or hidden elements if common?
                                # For now, just get text
                                text = body.get_text(separator="\n", strip=True)
                                full_text.append(text)
                        except KeyError:
                            # File missing in zip?
                            pass
                            
                    combined_text = "\n\n".join(full_text)
                    
                    # Word count
                    word_count = len(combined_text.split())
                    
                    row = {
                        "source": "Standard Ebooks",
                        "slug": book_meta.get("slug", filename_base),
                        "text_content": combined_text,
                        "metadata": {
                            "author": book_meta.get("author", "Unknown"),
                            "title": book_meta.get("title", "Unknown"),
                            "subject": book_meta.get("subjects", ["Philosophy"]),
                            "reading_ease": book_meta.get("reading_ease"),
                            "difficulty": book_meta.get("difficulty"),
                            "word_count": word_count,
                            "source_word_count": book_meta.get("source_word_count"),
                            "filename": epub_file
                        }
                    }
                    output_rows.append(row)
                    
            except Exception as e:
                logging.error(f"Failed to process {epub_file}: {e}")

        # Write output
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            for row in output_rows:
                f.write(json.dumps(row) + "\n")
                
        logging.info(f"Phase III Complete. Extracted {len(output_rows)} books to {OUTPUT_FILE}")

if __name__ == "__main__":
    extractor = StandardEbooksExtractor()
    catalog = extractor.run_crawler()
    extractor.run_downloader(catalog)
    extractor.run_extractor()
