import os
import subprocess
import json
import argparse
from pathlib import Path
from typing import List, Dict
import xml.etree.ElementTree as ET

# Configuration
TARGET_REPOS = [
    "https://github.com/PerseusDL/canonical-greekLit",
    "https://github.com/PerseusDL/canonical-latinLit",
    "https://github.com/PerseusDL/canonical-engLit",
    "https://github.com/PerseusDL/lexica"
]

MIRROR_DIR_NAME = "perseus_local_mirror"
NAMESPACES = {'tei': 'http://www.tei-c.org/ns/1.0'}

def run_git_command(command: List[str], cwd: Path) -> None:
    """Runs a git command in the specified directory."""
    try:
        subprocess.run(command, check=True, cwd=cwd, capture_output=True, text=True)
        print(f"Successfully ran: {' '.join(command)}")
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {' '.join(command)}")
        print(f"Error output: {e.stderr}")
        raise

def setup_directories(base_path: Path) -> Path:
    """Creates the mirror directory if it doesn't exist."""
    mirror_path = base_path / MIRROR_DIR_NAME
    if not mirror_path.exists():
        print(f"Creating mirror directory at: {mirror_path}")
        mirror_path.mkdir(parents=True, exist_ok=True)
    return mirror_path

def ingest_repository(repo_url: str, mirror_path: Path):
    """Clones or pulls a single repository."""
    repo_name = repo_url.split("/")[-1]
    repo_path = mirror_path / repo_name

    if repo_path.exists():
        print(f"Updating existing repository: {repo_name}")
        # Check if it is a git repo
        if (repo_path / ".git").exists():
            run_git_command(["git", "pull"], cwd=repo_path)
        else:
            print(f"Warning: {repo_path} exists but is not a git repository. Skipping.")
    else:
        print(f"Cloning new repository: {repo_name}")
        run_git_command(["git", "clone", "--depth", "1", repo_url], cwd=mirror_path)

def extract_metadata(file_path: Path) -> Dict[str, str]:
    """Extracts title and author from a TEI XML file."""
    metadata = {"title": "", "author": ""}
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Extract Title
        title_elem = root.find(".//tei:titleStmt/tei:title", NAMESPACES)
        if title_elem is not None and title_elem.text:
            metadata["title"] = title_elem.text.strip()
            
        # Extract Author
        author_elem = root.find(".//tei:titleStmt/tei:author", NAMESPACES)
        if author_elem is not None and author_elem.text:
            metadata["author"] = author_elem.text.strip()
            
    except ET.ParseError:
        print(f"Warning: Failed to parse XML {file_path}")
    except Exception as e:
        # Some files might not have valid TEI headers or different structure
        pass
        
    return metadata

def generate_manifest(mirror_path: Path) -> Dict:
    """Scans the mirror directory and generates a manifest."""
    manifest = {
        "repositories": {},
        "total_files": 0,
        "files": []
    }

    print("Generating manifest...")
    
    for repo_url in TARGET_REPOS:
        repo_name = repo_url.split("/")[-1]
        repo_path = mirror_path / repo_name
        
        if not repo_path.exists():
            continue

        manifest["repositories"][repo_name] = {"count": 0}
        
        # Check for 'data' directory to narrow down the search
        search_path = repo_path / "data"
        if not search_path.exists():
            search_path = repo_path

        # Walk through the repository
        # Perseus structure is typically data/textgroup/work/file.xml
        for root, _, files in os.walk(search_path):
            for file in files:
                if file.endswith(".xml"):
                    full_path = Path(root) / file
                    rel_path = full_path.relative_to(mirror_path)
                    
                    # Basic exclusion of config files if any
                    if file.startswith("."):
                        continue
                    
                    # Extract metadata
                    metadata = extract_metadata(full_path)
                        
                    manifest["files"].append({
                        "path": str(rel_path),
                        "repo": repo_name,
                        "title": metadata.get("title", ""),
                        "author": metadata.get("author", "")
                    })
                    manifest["repositories"][repo_name]["count"] += 1
                    manifest["total_files"] += 1

    return manifest

def main():
    parser = argparse.ArgumentParser(description="Ingest Perseus Digital Library texts.")
    parser.add_argument("--root", type=str, default=".", help="Root directory for the project")
    args = parser.parse_args()

    root_path = Path(args.root).resolve()
    mirror_path = setup_directories(root_path)

    # Ingest Repositories
    for repo in TARGET_REPOS:
        try:
            ingest_repository(repo, mirror_path)
        except Exception as e:
            print(f"Failed to ingest {repo}: {e}")

    # Generate Manifest
    manifest = generate_manifest(mirror_path)
    
    manifest_path = mirror_path / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"Ingestion complete. Manifest saved to {manifest_path}")
    print(f"Total XML files found: {manifest['total_files']}")

if __name__ == "__main__":
    main()
