import os
import requests
import time
import json
import re
from bs4 import BeautifulSoup

# Configuration
# Output directory to the 'data' folder at the specific location
DATA_DIR = os.path.join(os.getcwd(), "data", "gutenberg")
os.makedirs(DATA_DIR, exist_ok=True)

# Subjects to search as per spec
SUBJECTS = [
    "Philosophy",
    "Logic",
    "Speculative Philosophy",
    "Ethics",
    "Psychology"
]

BASE_URL = "https://www.gutenberg.org"

def get_soup(url):
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Failed to fetch {url} (Status: {response.status_code})")
            return None
        return BeautifulSoup(response.content, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def search_books(subject):
    print(f"Searching for {subject}...")
    # Using the standard search query
    quoted_subject = requests.utils.quote(subject)
    url = f"{BASE_URL}/ebooks/search/?query={quoted_subject}&submit_search=Go%21"
    
    books = []
    soup = get_soup(url)
    if not soup:
        return []
    
    book_links = soup.select('li.booklink a.link')
    for link in book_links:
        href = link.get('href')
        if href and href.startswith('/ebooks/'):
            book_id = href.split('/')[-1]
            try:
                int(book_id) # Verify it is an ID
                title_span = link.select_one('.title')
                author_span = link.select_one('.subtitle')
                
                title = title_span.text.strip() if title_span else "Unknown"
                author = author_span.text.strip() if author_span else "Unknown"
                
                books.append({
                    "id": book_id,
                    "title": title,
                    "author": author,
                    "subject": subject
                })
            except ValueError:
                pass
    return books

def download_text(book_id):
    download_url = f"{BASE_URL}/ebooks/{book_id}"
    soup = get_soup(download_url)
    if not soup:
        return None, None

    # Look for Plain Text UTF-8 link
    # The structure varies, but usually <a href="..." type="text/plain; charset=utf-8"> or similar
    # We look for the text containing "Plain Text UTF-8"
    
    text_link = soup.find('a', string=re.compile(r'Plain Text UTF-8'))
    if not text_link:
         # Try type attribute
         text_link = soup.find('a', type=re.compile(r'text/plain'))
    
    if text_link:
        file_url = text_link.get('href')
        if file_url.startswith('//'):
            file_url = 'https:' + file_url
        elif file_url.startswith('/'):
            file_url = BASE_URL + file_url
            
        print(f"Downloading book {book_id} from {file_url}")
        try:
             res = requests.get(file_url, timeout=30)
             if res.status_code == 200:
                 return res.text, file_url
        except Exception as e:
            print(f"Error downloading {file_url}: {e}")
            
    return None, None

def clean_text(text):
    # Strip Gutenberg headers/footers
    start_match = re.search(r'\*\*\* START OF (THIS|THE) PROJECT GUTENBERG EBOOK', text, re.IGNORECASE)
    end_match = re.search(r'\*\*\* END OF (THIS|THE) PROJECT GUTENBERG EBOOK', text, re.IGNORECASE)
    
    start_idx = 0
    end_idx = len(text)
    
    if start_match:
        # Move past the line
        start_idx = text.find('\n', start_match.end())
        if start_idx == -1: start_idx = start_match.end()
        
    if end_match:
        end_idx = end_match.start()
        
    cleaned = text[start_idx:end_idx].strip()
    return cleaned

def extract_metadata_from_text(text):
    meta = {}
    # Extract translator if present in first 100 lines
    head = text[:5000]
    
    # Translator
    trans_match = re.search(r'(?:Translator|Translated by):?\s*(.*)', head, re.IGNORECASE)
    if trans_match:
        meta['translator'] = trans_match.group(1).strip()
    
    # Original Publication Year (difficult heuristic)
    # Often formatted as "First published in 1892" or similar
    year_match = re.search(r'(?:published|copyright).*?(\d{4})', head, re.IGNORECASE)
    if year_match:
        meta['year'] = year_match.group(1)
        
    return meta

def main():
    processed_ids = set()
    
    # Ensure data dir
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    for subj in SUBJECTS:
        books = search_books(subj)
        # Limit to top 3 per subject to keep execution fast for this task
        count = 0
        for book in books:
            if count >= 3: 
                break
            if book['id'] in processed_ids:
                continue
            
            raw_text, source_url = download_text(book['id'])
            if raw_text:
                cleaned_text = clean_text(raw_text)
                
                # Combine metadata
                extracted = extract_metadata_from_text(raw_text)
                
                metadata = {
                    "id": book['id'],
                    "title": book['title'],
                    "author": book['author'],
                    "category": book['subject'],
                    "source_url": source_url,
                    "date": extracted.get('year', 'Unknown'), 
                    "translator": extracted.get('translator', 'Unknown')
                }
                
                # Save as .txt with JSON header for compatibility
                filename = f"pg_{book['id']}.txt"
                filepath = os.path.join(DATA_DIR, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(json.dumps(metadata))
                    f.write('\n\n')
                    f.write(cleaned_text)
                
                print(f"Saved {filename}")
                processed_ids.add(book['id'])
                count += 1
            
            time.sleep(1) # Be polite

if __name__ == "__main__":
    main()
