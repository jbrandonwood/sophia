import requests
from bs4 import BeautifulSoup
import os
import time
import json
import logging
from urllib.parse import urljoin, urlparse

# Configuration
BASE_URL = "http://classics.mit.edu"
INDEX_URL = f"{BASE_URL}/Browse/index.html"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "mit_classics")
USER_AGENT = "Sophia-Philosophy-Agent/0.1 (bot; contact: admin@sophia.dev)"
RATE_LIMIT = 1.0  # seconds

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("scraper.log"),
        logging.StreamHandler()
    ]
)

def get_page(url):
    """Fetches a page with rate limiting and error handling."""
    time.sleep(RATE_LIMIT)
    try:
        headers = {"User-Agent": USER_AGENT}
        logging.info(f"Fetching {url}...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        # Fix encoding issues common with old sites
        if response.encoding == 'ISO-8859-1':
            response.encoding = 'ISO-8859-1'
        return response.text
    except Exception as e:
        logging.error(f"Failed to fetch {url}: {e}")
        return None

def parse_authors():
    """Parses the main index to find author pages."""
    html = get_page(INDEX_URL)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    authors = []
    
    # Links are like <a href="browse-Author.html">Author</a>
    for a in soup.find_all("a", href=True):
        href = a['href']
        if href.startswith("browse-") and href.endswith(".html"):
            author_name = a.get_text(strip=True)
            url = urljoin(f"{BASE_URL}/Browse/", href)
            authors.append({"name": author_name, "url": url})
            
    logging.info(f"Found {len(authors)} authors.")
    return authors

def parse_works(author_url):
    """Parses an author page to find list of works."""
    html = get_page(author_url)
    if not html:
        return []
    
    soup = BeautifulSoup(html, "html.parser")
    works = []
    
    # Works links are generally relative or absolute. 
    # The structure on browse pages is a list of links.
    # We should exclude "Home", "Search", "Buy", "Help", "©"
    
    exclude_text = ["Home", "Search", "Buy Books and", "Help", "Browse and", "The Introduction"]
    
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        href = a['href']
        
        if not text:
            continue
            
        # Heuristic filtering
        if any(ex in text for ex in exclude_text) or "permissions.html" in href:
            continue
            
        if "index.html" in href and "Browse" not in href:
             continue
             
        if any(x in href for x in ["/Search/", "/Buy/", "/Help/"]):
            continue
             
        # Look for links that go to a work page (usually ../Author/work.html or absolute)
        # Typically on browse-[Author].html, links are like ../Author/work.html 
        # But we saw http://classics.mit.edu/Plato/republic.html in the crawl
        
        full_url = urljoin(author_url, href)
        
        # Basic check to see if it looks like a work page
        if ".html" in full_url and "Browse" not in full_url:
             logging.info(f"Adding potential work: {text} -> {full_url}")
             works.append({"title": text, "url": full_url})
        else:
             logging.debug(f"Skipping link: {text} -> {full_url}")
             
    logging.info(f"Found {len(works)} works on {author_url}")
    return works

def find_text_download_link(work_url, soup):
    """Finds the download link for the text version."""
    # Pattern: Link text contains "download" or "text-only" and ends in .txt
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True).lower()
        href = a['href']
        
        if ".txt" in href:
             logging.info(f"Found candidate text link: {text} -> {href}")

        if ("download" in text or "text-only" in text or "available" in text) and ".txt" in href:
            return urljoin(work_url, href)
            
    return None

def extract_metadata(work_url, soup, author_name, title):
    """Extracts metadata from the work page."""
    # This is tricky without strict structure. We'll use defaults and basic parsing.
    # The spec asks for a header.
    
    # Try to find translator or date in text
    # Usually in the header or near the title.
    
    text_content = soup.get_text()
    translator = "Unknown"
    date = "Unknown"
    
    if "Translated by" in text_content:
        # Very naive, but logic for MVP
        try:
            part = text_content.split("Translated by")[1].split("\n")[0]
            translator = part.strip().strip(".")
        except:
            pass
            
    return {
        "title": title,
        "author": author_name,
        "translator": translator,
        "date": date,
        "source_url": work_url
    }

def process_work(author_name, work):
    """Downloads a single work."""
    work_url = work['url']
    work_title = work['title']
    
    # Create directory
    author_dir = os.path.join(DATA_DIR, author_name.replace(" ", "_"))
    os.makedirs(author_dir, exist_ok=True)
    
    # File path
    safe_title = "".join(c for c in work_title if c.isalnum() or c in (' ', '-', '_')).strip().replace(" ", "_")
    output_path = os.path.join(author_dir, f"{safe_title}.txt")
    
    if os.path.exists(output_path):
        logging.info(f"Skipping {work_title}, already exists.")
        return

    html = get_page(work_url)
    if not html:
        return
        
    soup = BeautifulSoup(html, "html.parser")
    
    # Attempt A: Download .txt
    txt_link = find_text_download_link(work_url, soup)
    content = ""
    
    if txt_link:
        logging.info(f"Downloading text version for {work_title}...")
        txt_content = get_page(txt_link)
        if txt_content:
            content = txt_content
    else:
        logging.warning(f"No text link found for {work_title}. Fallback extraction needed (Skipping for MVP initial pass).")
        # For now, we log it. Fallback implementation can be added here.
        with open("missed_works.log", "a") as f:
            f.write(f"{author_name}|{work_title}|{work_url}\n")
        return

    # Metadata
    meta = extract_metadata(work_url, soup, author_name, work_title)
    
    # Save
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(meta, indent=2))
            f.write("\n\n")
            f.write(content)
        logging.info(f"Saved {work_title}")
    except Exception as e:
        logging.error(f"Error saving {work_title}: {e}")

def main():
    logging.info("Starting MIT Classics Scraper")
    os.makedirs(DATA_DIR, exist_ok=True)
    
    authors = parse_authors()
    
    # FOR TESTING: Limit to first 2 authors
    # authors = authors[:2]  
    
    for author in authors:
        logging.info(f"Processing Author: {author['name']}")
        works = parse_works(author['url'])
        
        # FOR TESTING: Limit to first 3 works per author
        # works = works[:3]
        
        for work in works:
            process_work(author['name'], work)

if __name__ == "__main__":
    main()
