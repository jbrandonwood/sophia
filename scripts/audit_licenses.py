import os
import re
from collections import defaultdict

MIRROR_ROOT = "/Users/brandonwood/Desktop/sophia/perseus_local_mirror"

def get_license_info(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Regex to find licence tags: <licence ...>text</licence> or just <licence>text</licence>
        # We need to handle attributes in the opening tag.
        # This regex looks for <licence and then captures up to </licence>
        
        # Note: namespace prefixes like <tei:licence> might exist
        licence_matches = re.findall(r'<(?:\w+:)?licence([^>]*)>(.*?)</(?:\w+:)?licence>', content, re.DOTALL | re.IGNORECASE)
        
        results = []
        if not licence_matches:
            # Check if availability exists but no licence tag (unlikely but possible)
            if "<availability" in content and "<licence" not in content:
                return ["Availability present but no licence tag"]
            if "<availability" not in content:
                return ["No availability/licence tag found"]
        
        for attrs, text in licence_matches:
            # Extract target from attributes if present
            target_match = re.search(r'target=["\']([^"\']+)["\']', attrs)
            target = target_match.group(1) if target_match else ""
            
            clean_text = " ".join(text.split())
            if target:
                results.append(f"Target: {target} | Text: {clean_text}")
            else:
                results.append(f"Text: {clean_text}")
                
        return results

    except Exception as e:
        return [f"Error reading: {str(e)}"]

def audit_directory(root_dir):
    repo_stats = defaultdict(lambda: defaultdict(int))
    restrictive_files = []
    englit_unlicensed = []
    
    print(f"Scanning {root_dir}...")
    
    for subdir, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".xml") and "__cts__.xml" not in file:
                path = os.path.join(subdir, file)
                rel_path = os.path.relpath(path, root_dir)
                repo_name = rel_path.split(os.sep)[0]
                
                licenses = get_license_info(path)
                
                for license in licenses:
                    repo_stats[repo_name][license] += 1
                    
                    is_restrictive = False
                    lower_lic = license.lower()
                    
                    if "non-commercial" in lower_lic or "noncommercial" in lower_lic:
                        is_restrictive = True
                    if "all rights reserved" in lower_lic:
                        is_restrictive = True
                    if "permission" in lower_lic and "creative commons" not in lower_lic:
                        is_restrictive = True
                        
                    if is_restrictive:
                        restrictive_files.append((path, license))
                        
                    # Check for engLit specific risk
                    if repo_name == "canonical-engLit" and "No availability/licence tag found" in license:
                        englit_unlicensed.append(path)

    print("\n--- License Summary by Repository ---")
    for repo, counts in sorted(repo_stats.items()):
        print(f"\nRepostory: {repo}")
        sorted_licenses = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        for lic, count in sorted_licenses:
            print(f"  [{count}] {lic}")

    print("\n--- Potentially Restrictive Files (Explicit Restrictions) ---")
    if restrictive_files:
        for path, lic in restrictive_files:
            rel_path = os.path.relpath(path, root_dir)
            print(f"{rel_path}: {lic}")
    else:
        print("No files with explicit NonCommercial/ARR restrictions found.")
        
    print("\n--- High Risk: Unlicensed files in canonical-engLit ---")
    print("(These files lack an internal license tag AND the repo lacks a blanket README license)")
    if englit_unlicensed:
        for path in englit_unlicensed:
            rel_path = os.path.relpath(path, root_dir)
            print(f"{rel_path}")
    else:
        print("None found.")

if __name__ == "__main__":
    audit_directory(MIRROR_ROOT)
