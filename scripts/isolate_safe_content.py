import os
import shutil
import json
import logging

# Configuration
SOURCE_ROOT = os.path.abspath("perseus_local_mirror")
DEST_ROOT = os.path.abspath("perseus_safe_mirror")
MANIFEST_FILE = "manifest.json"

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def is_safe_path(path):
    """
    Determines if a file path is safe to copy based on safety rules.
    """
    rel_path = os.path.relpath(path, SOURCE_ROOT)
    parts = rel_path.split(os.sep)
    
    # 1. Safe Repositories (Blanket Licensed)
    if parts[0] in ["canonical-greekLit", "canonical-latinLit", "lexica"]:
        # Exclude hidden files (e.g. .git)
        if any(part.startswith('.') for part in parts):
            return False
        return True

    # 2. Mixed Repository (canonical-engLit)
    if parts[0] == "canonical-engLit":
        # Rule A: Allow "opensource" directories
        if "opensource" in parts:
            return True
        # Rule B: Allow "data" directory (CTS formatted, explicitly licensed)
        if "data" in parts:
             return True
        
        # Rule C: Allow root files (README, etc) but not hidden git stuff
        if len(parts) == 2 and not parts[1].startswith('.'):
             return True
             
        return False

    # 3. Root files (manifest.json)
    if len(parts) == 1 and not parts[0].startswith('.'):
        return True
        
    return False

def copy_safe_content():
    if os.path.exists(DEST_ROOT):
        logging.warning(f"Destination {DEST_ROOT} exists. Deleting...")
        shutil.rmtree(DEST_ROOT)
    
    logging.info(f"Copying safe content from {SOURCE_ROOT} to {DEST_ROOT}...")
    
    files_copied = 0
    
    for subdir, dirs, files in os.walk(SOURCE_ROOT):
        # Filter directories to avoid traversing .git
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if file.startswith('.'): continue
            
            src_path = os.path.join(subdir, file)
            
            if is_safe_path(src_path):
                # Construct destination path
                rel_path = os.path.relpath(src_path, SOURCE_ROOT)
                dest_path = os.path.join(DEST_ROOT, rel_path)
                
                # Copy
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(src_path, dest_path)
                files_copied += 1
                
    logging.info(f"Copied {files_copied} files.")

def update_manifest():
    """
    Reads the original manifest, filters entries that don't exist in the safe mirror,
    and writes a new manifest in the safe mirror.
    """
    src_manifest_path = os.path.join(SOURCE_ROOT, MANIFEST_FILE)
    dest_manifest_path = os.path.join(DEST_ROOT, MANIFEST_FILE)
    
    if not os.path.exists(src_manifest_path):
        logging.warning("No manifest found in source.")
        return

    with open(src_manifest_path, 'r') as f:
        data = json.load(f)
        
    original_count = len(data.get('files', []))
    new_files = []
    
    for entry in data.get('files', []):
        # entries usually look like {"path": "canonical-greekLit/...", ...}
        # Check if this file exists in DEST_ROOT
        full_dest_path = os.path.join(DEST_ROOT, entry['path'])
        if os.path.exists(full_dest_path):
            new_files.append(entry)
            
    data['files'] = new_files
    data['total_files'] = len(new_files)
    
    # Update repository counts
    repo_counts = {}
    for entry in new_files:
        repo = entry.get('repo', 'unknown')
        repo_counts[repo] = repo_counts.get(repo, 0) + 1
        
    # Preserving structure but updating counts
    if 'repositories' in data:
        for repo in data['repositories']:
            if repo in repo_counts:
                data['repositories'][repo]['count'] = repo_counts[repo]
            else:
                data['repositories'][repo]['count'] = 0

    with open(dest_manifest_path, 'w') as f:
        json.dump(data, f, indent=2)
        
    logging.info(f"Updated manifest. Files reduced from {original_count} to {len(new_files)}.")

if __name__ == "__main__":
    copy_safe_content()
    update_manifest()
