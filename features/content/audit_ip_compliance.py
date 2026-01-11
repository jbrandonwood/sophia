import os
import json
import csv
import logging
import argparse
from datetime import datetime

# Configuration
# Default to MIT Classics if not specified
DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "mit_classics")
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")
SAFE_TRANSLATORS_FILE = os.path.join(CONFIG_DIR, "safe_translators.json")
BLOCKED_TRANSLATORS_FILE = os.path.join(CONFIG_DIR, "blocked_translators.json")
REPORT_FILE = "copyright_audit.csv"

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(message)s")

def load_json_list(filepath):
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        logging.warning(f"Config file not found: {filepath}")
        return []

def classify_risk(metadata, safe_list, blocked_list):
    """
    Returns (Status, Reason)
    Status: SAFE, REVIEW, HIGH RISK
    """
    year = metadata.get("date")
    translator = metadata.get("translator", "").strip()
    
    # 1. Blocked Translators
    if any(blocked.lower() in translator.lower() for blocked in blocked_list):
        return "HIGH RISK", f"Blocked Translator: {translator}"

    # 2. Safe Translators
    if any(safe.lower() in translator.lower() for safe in safe_list):
        return "SAFE", f"Safe Translator: {translator}"
        
    # 3. Year Check (if date is parsable)
    # This is hard because "date" in classic texts often means 360 B.C., not pub date of translation.
    # The MIT archive metadata is often just the date of the work, NOT the translation.
    # HOWEVER, the spec says "extract publication_year (of the edition/translation)".
    # Our scraper is currently grabbing whatever is in the text, which might be ambiguous.
    # We will trust the Year if it looks modern (4 digits, > 1000).
    
    try:
        # Very simple extraction of 4 digit year
        # In reality, we need regex search in the header or text
        import re
        years = re.findall(r'\b(19\d{2}|20\d{2})\b', str(year)) + re.findall(r'\b(19\d{2}|20\d{2})\b', translator)
        
        valid_years = [int(y) for y in years]
        if valid_years:
            pub_year = max(valid_years)
            if pub_year < 1930:
                return "SAFE", f"Pre-1930: {pub_year}"
            elif pub_year >= 1930:
                return "REVIEW", f"Post-1930: {pub_year}"
    except:
        pass

    # 4. Default
    return "REVIEW", "Unknown Date/Translator"

def main():
    parser = argparse.ArgumentParser(description="Audit IP compliance of text files.")
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="Directory containing data to audit")
    args = parser.parse_args()

    data_dir = args.data_dir
    
    safe_translators = load_json_list(SAFE_TRANSLATORS_FILE)
    blocked_translators = load_json_list(BLOCKED_TRANSLATORS_FILE)
    
    results = []
    
    logging.info(f"Starting IP Audit for directory: {data_dir}")
    
    if not os.path.exists(data_dir):
        logging.error(f"Data directory not found: {data_dir}")
        return

    # Walk the data directory
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if not file.endswith(".txt"):
                continue
                
            path = os.path.join(root, file)
            
            # Read header
            try:
                with open(path, "r", encoding="utf-8") as f:
                    # Read first few lines or until first double newline to get JSON
                    # Our scraper writes JSON then \n\n then content
                    content = f.read()
                    header_end = content.find("\n\n")
                    if header_end == -1:
                        # Fallback if no split found, try simple load
                        header_str = content
                    else:
                        header_str = content[:header_end]
                    
                    try:
                        metadata = json.loads(header_str)
                    except json.JSONDecodeError:
                        logging.warning(f"Invalid JSON header in {file}")
                        metadata = {"title": file, "translator": "Unknown"}
                    
                    status, reason = classify_risk(metadata, safe_translators, blocked_translators)
                    
                    results.append({
                        "filename": file,
                        "author": metadata.get("author", "Unknown"),
                        "translator": metadata.get("translator", "Unknown"),
                        "risk_score": status,
                        "reason": reason
                    })
                    
            except Exception as e:
                logging.error(f"Error processing {file}: {e}")

    # Write CSV
    with open(REPORT_FILE, "w", newline="") as csvfile:
        fieldnames = ["filename", "author", "translator", "risk_score", "reason"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in results:
            writer.writerow(row)
            
    logging.info(f"Audit complete. Report saved to {REPORT_FILE}")

if __name__ == "__main__":
    main()
