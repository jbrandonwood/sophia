# Feature Spec: Corpus Normalization, IP Filtering, and RAG-Ready Processing

## 1. Objective
Transform disparate raw data from Perseus (TEI XML), MIT (HTML/TXT), and other sources into a unified, semantically structured, and legally compliant corpus. This stage serves as the final gateway before vectorization to ensure grounding constraints and "Hard Citations" (e.g., Stephanus pagination) are met.

## 2. Functional Requirements

### 2.1 Structural Normalization & Citation Retention (CTS-First)
* **Canonical Mapping:** Implement a **Canonical Text Services (CTS) URN** mapping for every ingested work to maintain repository-defined structures.
* **Stephanus/Bekker Preservation:** Explicitly extract and retain early format citations (e.g., "Apology 14a", "Nicomachean Ethics 1094a") during the flattening of TEI XML and HTML.
* **Tag Stripping:** Flatten complex XML/HTML while preserving these immutable structural markers (Book, Chapter, Section, Line/Margin node).
* **Standardization:** Transcode all content to `UTF-8` and normalize whitespace to prevent indexing artifacts.

### 2.2 IP Filtering & Automated Isolation
* **The "Traffic Light" Gatekeeper:** Apply logic to strictly separate "Public Domain" from "Copyrighted" translations:
    * **SAFE (Green):** Published < Jan 1, 1930, or verified CC0/CC-BY.
    * **REVIEW (Yellow):** Published 1930–1989 or unknown date; quarantine for manual check.
    * **HIGH RISK (Red):** Published > 1989 or modern translator found in `blocked_translators.json`.
* **Isolation Workflow:** Programmatically move only "SAFE" files to the production mirror (`perseus_safe_mirror`).

### 2.3 Semantic Deduplication & Metadata Repair
* **Duplicate Detection:** Identify redundant translations across repositories (e.g., Perseus vs. MIT) using content-based hashing of initial text blocks.
* **Metadata Authority Control:** Standardize Author and Title naming conventions; repair missing metadata by re-scanning source file headers for TEI `titleStmt` or JSON headers.
* **Language Tagging:** Tag files with `language_code` (Greek, Latin, English) extracted from repository names or file metadata.

### 2.4 Audit & Manifest Finalization
* **Inventory Generation:** Produce a final `manifest_overview.md` providing a human-readable summary of the safe corpus grouped by Author and Work.
* **System Cleanup:** Remove system-specific files (e.g., `__cts__.xml`) and update final repository counts in `manifest.json`.

## 3. Technical Constraints & Fail-Safes
* **Zero Trust:** Default any file with missing publication years or unknown translators to `REVIEW` status.
* **Hard Citation Integrity:** Every logical unit must be mappable to a specific citation (e.g., Aurelius, Meditations, IV.3) to support the Dialectic Reasoning Engine.
* **Regex Extraction:** Use robust regex for metadata extraction to bypass issues with complex XML namespaces or DTD resolution.

## 4. Antigravity Tasking Instructions
* **Manager:** Coordinate the operational sequence: Audit -> Isolate -> Repair -> Clean.
* **Editor:** Update `audit_ip_compliance.py` and `repair_manifest_metadata.py` to ensure Stephanus/Bekker nodes are captured as primary keys.
* **Browser:** Research and document standard CTS URN patterns for the top 50 works to ensure mapping accuracy.