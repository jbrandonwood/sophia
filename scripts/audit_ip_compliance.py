#!/usr/bin/env python3
"""
IP Compliance Auditor
Classifies the copyright status of ingested works based on year and translator.
Generates copyright_audit.csv.
"""

import sys
import os
import json
import csv
import re
from datetime import datetime

# Configuration
MANIFEST_FILE = "data/oll_corpus.jsonl" # Or wherever the manifest/data lives
OUTPUT_CSV = "copyright_audit.csv"
SAFE_LIST_FILE = "data/safe_translators.json"
BLOCKED_LIST_FILE = "data/blocked_translators.json"

# Traffic Light Constants
STATUS_SAFE = "SAFE"       # 🟢
STATUS_REVIEW = "REVIEW"   # 🟡
STATUS_HIGH_RISK = "HIGH RISK" # 🔴

def load_json_list(filepath):
    """Loads a JSON list from a file."""
    try:
        with open(filepath, 'r') as f:
            return set(json.load(f))
    except FileNotFoundError:
        print(f"Warning: {filepath} not found. Returning empty set.")
        return set()

def extract_year(date_str):
    """Extracts a 4-digit year from a string."""
    if not date_str:
        return None
    match = re.search(r'\b(1\d{3}|20\d{2})\b', str(date_str))
    if match:
        return int(match.group(1))
    return None

def check_translator(translator_name, safe_list, blocked_list):
    """Checks translator against lists."""
    if not translator_name or translator_name.lower() == "unknown":
        return None
        
    name = translator_name.lower()
    for safe in safe_list:
        if safe.lower() in name:
            return STATUS_SAFE
            
    for blocked in blocked_list:
        if blocked.lower() in name:
            return STATUS_HIGH_RISK
            
    return None

def assess_risk(entry, safe_list, blocked_list):
    """
    Determines the risk level of a work.
    Rules:
    1. < 1930 => SAFE
    2. Blocked Translator => HIGH RISK
    3. Safe Translator => SAFE
    4. Creative Commons => SAFE
    5. > 1989 => HIGH RISK (heuristic)
    6. Else => REVIEW
    """
    metadata = entry.get('metadata', {})
    
    # 1. Year Check
    year = extract_year(metadata.get('edition'))
    # Also check publication_date if available
    
    if year and year < 1930:
        return STATUS_SAFE, f"Pre-1930 ({year})"
        
    if year and year > 1989:
        return STATUS_HIGH_RISK, f"Post-1989 ({year})"
        
    # 2. Translator Check
    # Assuming author field might contain translator or separate field
    # If no explicit translator field, we might need to look at 'edition' or 'author'
    translator = "" # Logic to extract translator needs to be robust
    # For now, let's assume it might be in 'edition' or we need to look for "Trans."
    
    # Heuristic: Check names in edition string against lists
    edition_text = metadata.get('edition', '')
    trans_status = check_translator(edition_text, safe_list, blocked_list)
    if trans_status == STATUS_HIGH_RISK:
        return STATUS_HIGH_RISK, f"Blocked Translator in Edition info"
    if trans_status == STATUS_SAFE:
        return STATUS_SAFE, f"Safe Translator in Edition info"

    # 3. License Check
    # If source has license info. OLL is usually proprietary or PD.
    # We'll assume check manifest for explicit license field if it exists.
    
    return STATUS_REVIEW, "No clear safe criteria"

def main():
    safe_list = load_json_list(SAFE_LIST_FILE)
    blocked_list = load_json_list(BLOCKED_LIST_FILE)
    
    print(f"Loaded {len(safe_list)} safe translators and {len(blocked_list)} blocked translators.")
    
    if not os.path.exists(MANIFEST_FILE):
        print(f"Manifest file {MANIFEST_FILE} not found. Run ingestor first.")
        # Create a dummy file for testing if needed or exit
        # return
    
    # Read manifest (JSONL)
    works = []
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, 'r') as f:
            for line in f:
                if line.strip():
                    works.append(json.loads(line))
    
    print(f"Auditing {len(works)} works...")
    
    with open(OUTPUT_CSV, 'w', newline='') as csvfile:
        fieldnames = ['filename', 'title', 'author', 'translator', 'year', 'risk_score', 'reason']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for work in works:
            metadata = work.get('metadata', {})
            risk, reason = assess_risk(work, safe_list, blocked_list)
            
            writer.writerow({
                'filename': work.get('oll_id', 'unknown'),
                'title': metadata.get('title', 'unknown'),
                'author': metadata.get('author', 'unknown'),
                'translator': 'Check Edition', # Placeholder
                'year': extract_year(metadata.get('edition')),
                'risk_score': risk,
                'reason': reason
            })
            
    print(f"Audit complete. Report saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
