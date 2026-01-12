#!/usr/bin/env python3
import argparse
import subprocess
import json
import sys
import os
from typing import List, Optional

# Constants from Spec
BUCKET_NAME = "sophia-corpus-production"
BUCKET_REGION = "us-central1"
DATA_STORE_ID = "sophia-kb-v1"
DATA_STORE_LOCATION = "global" 
PROJECT_ID_CMD = "gcloud config get-value project"

DRY_RUN = False

def run_command(command: str, check=True, capture_output=True) -> subprocess.CompletedProcess:
    """Runs a shell command and returns the result."""
    if DRY_RUN and not command.startswith("gcloud config") and "storage buckets describe" not in command:
        print(f"[DRY RUN] Would run: {command}")
        return subprocess.CompletedProcess(args=command, returncode=0, stdout="")

    try:
        print(f"Running: {command}")
        result = subprocess.run(
            command,
            shell=True,
            check=check,
            capture_output=capture_output,
            text=True
        )
        if result.stdout:
            print(result.stdout.strip())
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def get_project_id() -> str:
    if DRY_RUN:
        return "dry-run-project"
        
    res = run_command(PROJECT_ID_CMD, check=False)
    proj_id = res.stdout.strip()
    if not proj_id:
        print("Error: No Google Cloud Project ID found.")
        print("Please run 'gcloud config set project YOUR_PROJECT_ID' or set it via environment.")
        sys.exit(1)
    return proj_id

def init_infrastructure():
    """Initializes GCS Bucket and Vertex AI Data Store."""
    project_id = get_project_id()
    print(f"Initializing Infrastructure for Project: {project_id}")

    # 1. Enable Services
    print("\n[1/3] Enabling Services...")
    run_command("gcloud services enable discoveryengine.googleapis.com storage.googleapis.com", check=False)

    # 2. Create Bucket
    print("\n[2/3] Creating GCS Bucket...")
    # Check if bucket exists
    check_bucket = run_command(f"gcloud storage buckets describe gs://{BUCKET_NAME}", check=False, capture_output=True)
    if check_bucket.returncode != 0:
        run_command(f"gcloud storage buckets create gs://{BUCKET_NAME} --location={BUCKET_REGION}")
    else:
        print(f"Bucket gs://{BUCKET_NAME} already exists.")

    # 3. Create Data Store
    # NOTE: Creating Data Stores via CLI is currently complex or requires beta/alpha commands or API calls.
    # We will try to use the `gcloud alpha discovery-engine` if available, or print instructions/use curl.
    # For now, let's assume we can use the gcloud alpha command or just verify it exists.
    # Note: As of late 2024/2025, gcloud might have 'discovery-engine' or 'alpha discovery-engine'.
    
    print("\n[3/3] Checking Data Store...")
    # List data stores to check if it exists
    # Using REST API via curl might be safer if CLI is unstable, but let's try a safe CLI check first.
    # "gcloud discovery-engine data-stores list --location=global --collection=default_collection"
    
    # We will implement a simplified check. If it doesn't exist, we will warn the user or try to create it.
    # Constructing the create command:
    # This part is tricky to get right blindly. I'll provide a clear instruction to the user if automation fails.
    
    print(f"Please ensure Data Store '{DATA_STORE_ID}' exists in location '{DATA_STORE_LOCATION}'.")
    print("If not, create it via Console or runs:")
    print(f"gcloud discovery-engine data-stores create {DATA_STORE_ID} --display-name='Sophia Philosophical Knowledge Base' --solution-type=CHAT --content-config=CONTENT_REQUIRED --location={DATA_STORE_LOCATION}")
    
    # We can try to run it:
    try_create = input(f"Attempt to create Data Store '{DATA_STORE_ID}'? (y/n): ")
    if try_create.lower() == 'y':
         run_command(f"gcloud alpha discovery-engine data-stores create {DATA_STORE_ID} --display-name='Sophia Philosophical Knowledge Base' --solution-type=CHAT --content-config=CONTENT_REQUIRED --location={DATA_STORE_LOCATION}", check=False)

def prepare_staging_file(input_file: str, output_file: str) -> bool:
    """Reads input, splits large records, writes to output."""
    print(f"Preparing staging file {output_file} from {input_file}...")
    try:
        if not os.path.exists(input_file):
            print(f"Error: File {input_file} not found.")
            return False
            
        with open(input_file, 'r', encoding='utf-8') as fin, open(output_file, 'w', encoding='utf-8') as fout:
            for i, line in enumerate(fin):
                line_size = len(line.encode('utf-8'))
                if line_size > 20 * 1024 * 1024:  # 20MB
                    print(f"Splitting line {i+1} (Size: {line_size/1024/1024:.2f} MB)...")
                    try:
                        record = json.loads(line)
                        text = record.get("text", "")
                        midpoint = len(text) // 2
                        
                        # Part 1
                        rec1 = record.copy()
                        rec1["text"] = text[:midpoint]
                        rec1["section_part"] = "1/2"
                        rec1["uuid"] = f"{rec1.get('uuid', '')}-part1"
                        fout.write(json.dumps(rec1) + "\n")
                        
                        # Part 2
                        rec2 = record.copy()
                        rec2["text"] = text[midpoint:]
                        rec2["section_part"] = "2/2"
                        rec2["uuid"] = f"{rec2.get('uuid', '')}-part2"
                        fout.write(json.dumps(rec2) + "\n")
                        
                    except json.JSONDecodeError:
                        print(f"Error decoding JSON on line {i+1}. Skipping split.")
                        fout.write(line)
                else:
                    fout.write(line)
        print("Staging file prepared.")
        return True
    except Exception as e:
        print(f"Preparation failed with error: {e}")
        return False

def sync_data():
    """Syncs data to GCS and triggers import."""
    project_id = get_project_id()
    local_file = "data/master_corpus_deduplicated.jsonl"
    staging_file = "data/master_corpus_staging.jsonl"
    gcs_uri = f"gs://{BUCKET_NAME}/data/master_corpus.jsonl"

    # 1. Prepare (Validate & Split)
    if not prepare_staging_file(local_file, staging_file):
        print("Aborting sync due to preparation failure.")
        sys.exit(1)

    # 2. Upload
    print(f"\n[2/3] Uploading {staging_file} to {gcs_uri}...")
    run_command(f"gcloud storage cp {staging_file} {gcs_uri}")

    # 3. Import
    print(f"\n[3/3] Triggering Import to Data Store '{DATA_STORE_ID}'...")
    
    # Constructing the import request for curl to ensure we get the chunking config right.
    # Using the discoveryengine v1beta API which supports advanced chunking config.
    access_token = run_command("gcloud auth print-access-token", capture_output=True).stdout.strip()
    
    url = f"https://discoveryengine.googleapis.com/v1beta/projects/{project_id}/locations/{DATA_STORE_LOCATION}/collections/default_collection/dataStores/{DATA_STORE_ID}/branches/default_branch/documents:import"
    
    # CLI Command
    cmd = (
        f"gcloud alpha discovery-engine data-stores import documents "
        f"--data-store-id={DATA_STORE_ID} "
        f"--gcs-source={gcs_uri} "
        f"--location={DATA_STORE_LOCATION} "
        f"--reconciliation-mode=INCREMENTAL"
    )
    
    print("Running Import Command...")
    run_command(cmd, check=False)
    print("Import initiated. Check status with 'status' command.")

def check_status():
    """Checks the status of operations."""
    project_id = get_project_id()
    print(f"Checking Operations for Project: {project_id} in {DATA_STORE_LOCATION}")
    
    # Try using 'alpha' as discovery-engine is often in alpha/beta
    # We will try to determine the command prefix.
    base_cmd = "gcloud discovery-engine"
    
    # Check if we need alpha
    # A simple way is to try running help or just default to alpha if standard failed.
    # Given the error "Invalid choice: 'discovery-engine'", it means the top level group is missing or it requires alpha.
    # Usually it is `gcloud alpha discovery-engine` or `gcloud discovery-engine` (if GA).
    # Since it failed, let's try alpha.
    
    cmd = (
        f"gcloud alpha discovery-engine operations list "
        f"--location={DATA_STORE_LOCATION} "
        f"--filter='done=false' "
        f"--limit=5"
    )
    result = run_command(cmd, check=False, capture_output=True)
    
    if result.returncode != 0:
        print("Failed to list operations.")
        print("STDERR:", result.stderr)
        if "Invalid choice: 'discovery-engine'" in result.stderr or "Invalid choice: 'alpha'" in result.stderr:
             print("\nPrerequisite Missing: Please run 'gcloud components install alpha' to use discovery-engine commands.")
        return

    if not result.stdout.strip():
        print("No active operations found.")
        print("Recent completed operations:")
        run_command(cmd.replace("done=false", "done=true"), check=False)
    else:
        print("Active Operations:")
        print(result.stdout)

def deploy_init():
    """Initializes Cloud Run and Secret Manager infrastructure."""
    project_id = get_project_id()
    print(f"Initializing Deployment Infrastructure for Project: {project_id}")

    # 1. Enable APIs
    print("\n[1/3] Enabling Cloud Run APIs...")
    services = "run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com"
    run_command(f"gcloud services enable {services}", check=False)

    # 2. Check Secrets (Skipped - Using GitHub Secrets)
    print("\n[2/3] Secrets are managed via GitHub Actions.")

    # 3. Artifact Registry
    print("\n[3/3] ensuring Artifact Registry Repo...")
    repo_name = "sophia-repo"
    start_check = run_command(f"gcloud artifacts repositories describe {repo_name} --location={BUCKET_REGION}", check=False, capture_output=True)
    if start_check.returncode != 0:
        print(f"Creating repository {repo_name}...")
        run_command(f"gcloud artifacts repositories create {repo_name} --repository-format=docker --location={BUCKET_REGION} --description='Sophia Docker Repository'")
    else:
        print(f"Repository {repo_name} exists.")


def main():
    parser = argparse.ArgumentParser(description="Antigravity: Sophia Knowledge Base Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Init
    parser_init = subparsers.add_parser("init", help="Initialize GCS and Vertex AI infrastructure")

    # Sync
    parser_sync = subparsers.add_parser("sync", help="Upload data and trigger import")

    # Status
    # Status
    parser_status = subparsers.add_parser("status", help="Check operation status")

    # Deploy Init
    parser_deploy = subparsers.add_parser("deploy-init", help="Initialize Cloud Run and Secrets infrastructure")

    parser.add_argument("--dry-run", action="store_true", help="Run in mock mode without making cloud calls")

    args = parser.parse_args()

    global DRY_RUN
    if args.dry_run:
        DRY_RUN = True
        print("--- DRY RUN MODE ---")

    if args.command == "init":
        init_infrastructure()
    elif args.command == "sync":
        sync_data()
    elif args.command == "status":
        check_status()
    elif args.command == "deploy-init":
        deploy_init()

if __name__ == "__main__":
    main()
