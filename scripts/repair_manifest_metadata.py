import json
import os
import re

MANIFEST_PATH = "content/import_safe_1/perseus_safe_mirror/manifest.json"
MIRROR_ROOT = "content/import_safe_1/perseus_safe_mirror"

def get_metadata_from_xml(file_path):
    """
    Extracts title and author from TEI XML files using regex.
    We use regex to avoid issues with DTD resolution and namespace complexity.
    """
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        # Regex to find titleStmt block to limit search scope (optional, but safer)
        # But for simplicity and speed, we'll search for the first occurrence of title and author
        # usually found in the header.
        
        # Extract Title
        # Looking for <title>...</title> inside <titleStmt> ideally, but simplicity first.
        # TEI headers usually have <title> as one of the first elements.
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""
        
        # Clean up title (remove newlines, extra spaces)
        title = " ".join(title.split())

        # Extract Author
        author_match = re.search(r'<author[^>]*>(.*?)</author>', content, re.IGNORECASE | re.DOTALL)
        author = author_match.group(1).strip() if author_match else ""
        
        # Clean up author
        author = " ".join(author.split())
        
        return title, author

    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return "", ""

def repair_manifest():
    if not os.path.exists(MANIFEST_PATH):
        print(f"Error: Manifest not found at {MANIFEST_PATH}")
        return

    print("Loading manifest...")
    with open(MANIFEST_PATH, 'r') as f:
        data = json.load(f)

    files = data.get('files', [])
    updated_count = 0
    
    print(f"Scanning {len(files)} entries for missing metadata...")

    for entry in files:
        path = entry.get('path', '')
        current_title = entry.get('title', '').strip()
        current_author = entry.get('author', '').strip()
        
        # If either title or author is missing, attempt to repair
        if not current_title or not current_author:
            full_path = os.path.join(MIRROR_ROOT, path)
            
            if os.path.exists(full_path):
                new_title, new_author = get_metadata_from_xml(full_path)
                
                changed = False
                if not current_title and new_title:
                    entry['title'] = new_title
                    changed = True
                
                if not current_author and new_author:
                    entry['author'] = new_author
                    changed = True
                    
                if changed:
                    updated_count += 1
                    # print(f"Repaired: {path} -> {entry['title']} | {entry['author']}")

    data['files'] = files
    
    print("Writing updated manifest...")
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Done. Repaired metadata for {updated_count} files.")

if __name__ == "__main__":
    repair_manifest()
