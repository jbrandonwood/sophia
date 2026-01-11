import json
from collections import defaultdict

MANIFEST_PATH = "content/import_safe_1/perseus_safe_mirror/manifest.json"
OUTPUT_PATH = "content/import_safe_1/perseus_safe_mirror/manifest_overview.md"

def generate_overview():
    try:
        with open(MANIFEST_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Manifest not found.")
        return

    files = data.get('files', [])
    
    # Group by Repo -> Author -> Titles
    content_tree = defaultdict(lambda: defaultdict(list))
    
    for entry in files:
        repo = entry.get('repo', 'Uncategorized')
        author = entry.get('author', 'Unknown Author')
        title = entry.get('title', 'Unknown Title')
        
        if not author: author = "Unknown Author"
        if not title: title = "Unknown Title"
        
        content_tree[repo][author].append(title)

    # Generate Markdown
    lines = ["# Perseus Safe Mirror: Content Overview", ""]
    lines.append(f"**Total Files:** {len(files)}")
    lines.append("")

    for repo in sorted(content_tree.keys()):
        lines.append(f"## {repo}")
        authors = content_tree[repo]
        
        for author in sorted(authors.keys()):
            works = sorted(list(set(authors[author]))) # Deduplicate titles
            lines.append(f"### {author}")
            for work in works:
                lines.append(f"- {work}")
            lines.append("")
        lines.append("---")

    with open(OUTPUT_PATH, 'w') as f:
        f.write("\n".join(lines))
    
    print(f"Overview generated at {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_overview()
