import json
import os

MANIFEST_PATH = "content/import_safe_1/perseus_safe_mirror/manifest.json"

def clean_manifest():
    if not os.path.exists(MANIFEST_PATH):
        print(f"Error: Manifest not found at {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH, 'r') as f:
        data = json.load(f)

    original_count = len(data.get('files', []))
    
    # Filter out __cts__.xml files
    cleaned_files = [
        entry for entry in data.get('files', [])
        if not entry['path'].endswith('__cts__.xml')
    ]
    
    removed_count = original_count - len(cleaned_files)
    
    data['files'] = cleaned_files
    data['total_files'] = len(cleaned_files)

    # Recalculate repo counts
    repo_counts = {}
    for entry in cleaned_files:
        repo = entry.get('repo', 'unknown')
        repo_counts[repo] = repo_counts.get(repo, 0) + 1
        
    if 'repositories' in data:
        for repo in data['repositories']:
            if repo in repo_counts:
                data['repositories'][repo]['count'] = repo_counts[repo]
            else:
                data['repositories'][repo]['count'] = 0

    with open(MANIFEST_PATH, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Manifest cleaned. Removed {removed_count} '__cts__.xml' entries. Remaining files: {len(cleaned_files)}")

if __name__ == "__main__":
    clean_manifest()
