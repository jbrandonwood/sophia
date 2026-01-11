#!/usr/bin/env python3
"""
Liberty Fund Ingestor (OLL)
Crawls oll.libertyfund.org to ingest philosophical works.
Extracts metadata, content (front matter, body, footnotes), and saves to JSONL.
"""

import sys
import os
import time
import json
import random
import argparse
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://oll.libertyfund.org"
TITLES_URL = f"{BASE_URL}/titles"
OUTPUT_FILE = "data/oll_corpus.jsonl"
USER_AGENT = "Philosophy-Agent-Ingestor/1.0 (Contact: admin@example.com)"

# Target subjects to prioritize (keywords in collection names or titles)
TARGET_SUBJECTS = [
    "Scottish Enlightenment",
    "American Revolution",
    "Constitution",
    "Natural Law",
    "Enlightenment",
    "Ludwig von Mises",
    "Smith",
    "Hume",
    "Ferguson",
    "History",
    "Liberty",
    "Political"
]

def get_headers():
    return {
        "User-Agent": USER_AGENT
    }

def random_sleep(min_seconds=2, max_seconds=5):
    """Sleep for a random duration to respect rate limits."""
    duration = random.uniform(min_seconds, max_seconds)
    time.sleep(duration)

def fetch_page(url):
    """Fetches a page with error handling and rate limiting."""
    print(f"Fetching: {url}")
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        random_sleep()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_titles_page(html_content):
    """Parses the main titles page to find book links."""
    soup = BeautifulSoup(html_content, 'html.parser')
    # This logic depends on the actual structure of OLL.
    # Assuming standard list structure for now. Adapting to generic finding if strict structure is unknown.
    # Looking for /title/ links.
    
    links = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        # Links are like /titles/author-title
        if href.startswith('/titles/') and href != '/titles':
            # Exclude category/sorting pages
            if any(x in href for x in ['/categories/', '/by-author', '/by-editor', '/by-translator']):
                continue
            links.add(urljoin(BASE_URL, href))
    
    return list(links)

def is_relevant_work(metadata):
    """Filter based on target subjects."""
    # For now, simplistic check. In full run, might want to be permissive.
    text_blob = str(metadata).lower()
    for subject in TARGET_SUBJECTS:
        if subject.lower() in text_blob:
            return True
    return False

def extract_work_metadata(soup, url):
    """Extracts metadata from a work's page."""
    # Placeholder selectors - these need to be adjusted to actual OLL HTML structure
    try:
        # Title from og:title or H1
        title_meta = soup.find('meta', property='og:title')
        if title_meta:
            title = title_meta['content'].split('|')[0].strip()
        else:
            title = soup.find('h1').get_text(strip=True) if soup.find('h1') else "Unknown Title"
        
        # Author: look for .author-name links
        authors = [a.get_text(strip=True) for a in soup.find_all('a', class_='author-name')]
        author = ", ".join(authors) if authors else "Unknown"
        
        # Edition/Citation: look for #bibliography
        edition = "Unknown"
        bib_div = soup.find('div', id='bibliography')
        if bib_div:
             citation_p = bib_div.find('p')
             if citation_p:
                 edition = citation_p.get_text(strip=True)
        
        return {
            "title": title,
            "author": author,
            "edition": edition,
            "url": url,
            "collection": [], 
            "is_study_guide": "study guide" in title.lower()
        }
    except Exception as e:
        print(f"Error extracting metadata from {url}: {e}")
        return None

def extract_content(soup):
    """Extracts the main content components."""
    # OLL often has a specific class for the text body, e.g., 'oll-text' or similar.
    # We need to separate Intro, Body, Footnotes.
    
    # This is a heuristic approach.
    content = {
        "introduction": "",
        "main_body": "",
        "footnotes": {},
    }
    
    # Example logic (to be refined with actual page inspection)
    # intro_div = soup.find('div', class_='introduction')
    # if intro_div: content['introduction'] = intro_div.get_text()
    
    # body_div = soup.find('div', class_='calibre') # Common in ebook conversions
    # if body_div: content['main_body'] = body_div.get_text()
    
    return content

def process_work(url, dry_run=False):
    """Process a single work URL."""
    html = fetch_page(url)
    if not html:
        return None
        
    soup = BeautifulSoup(html, 'html.parser')
    
    metadata = extract_work_metadata(soup, url)
    if not metadata:
        return None
        
    print(f"Found: {metadata['title']}")
    
    if not is_relevant_work(metadata):
        print("Skipping (not matching target subjects)")
        return None
        
    content = extract_content(soup)
    
    entry = {
        "source": "Online Library of Liberty",
        "oll_id": url.split('/')[-1],
        "metadata": metadata,
        "content": content
    }
    
    return entry

def main():
    parser = argparse.ArgumentParser(description="Liberty Fund Ingestor")
    parser.add_argument("--dry-run", action="store_true", help="Run without saving full content (for testing)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of processed items")
    args = parser.parse_args()
    
    os.makedirs("data", exist_ok=True)
    
    print("Starting crawl of OLL titles...")
    titles_html = fetch_page(TITLES_URL)
    if not titles_html:
        print("Failed to fetch titles page.")
        return
        
    work_urls = parse_titles_page(titles_html)
    print(f"Found {len(work_urls)} potential titles.")
    
    processed_count = 0
    with open(OUTPUT_FILE, 'w') as f:
        for url in work_urls:
            if args.limit and processed_count >= args.limit:
                break
                
            entry = process_work(url, args.dry_run)
            if entry:
                f.write(json.dumps(entry) + "\n")
                f.flush()
                processed_count += 1
                
    print(f"Done. Processed {processed_count} works.")

if __name__ == "__main__":
    main()
