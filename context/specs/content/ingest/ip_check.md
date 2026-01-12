# Feature Spec: IP & Copyright Compliance Workflow

## 1. Objective
Establish an automated gatekeeping system to classify the Intellectual Property (IP) status of every ingested text. The goal is to strictly separate "Public Domain" (Safe) works from "Copyrighted" (High Risk) translations before they enter the Vector Database.

## 2. Risk Classification Matrix (The "Traffic Light" System)
Every file must be tagged with one of the following statuses in the `manifest.json`:

| Status | Color | Criteria | Action |
| :--- | :--- | :--- | :--- |
| **SAFE** | 🟢 | Published before **Jan 1, 1930** (US Public Domain) OR explicit CC0/CC-BY license. | Allow into Vector DB. |
| **REVIEW** | 🟡 | Published 1930–1989 OR No date found, but "classic" context implies age. | Quarantine for Manual Check. |
| **HIGH RISK** | 🔴 | Published > 1989 OR Known modern translator (e.g., Bloom, Fagles) OR explicit "All Rights Reserved". | **Block** from ingestion. |

## 3. Functional Requirements

### 3.1 Metadata Extraction Pipeline
The script must parse the header of every file (TEI Header for Perseus, JSON header for MIT) to extract:
* `publication_year` (of the *edition/translation*, not the original author).
* `translator_name`.
* `license_url` (Creative Commons tags).

### 3.2 Automated Rules Engine
Implement a Python logic check:
1.  **The "1930 Cutoff":** If `publication_year` < 1930 → Mark **SAFE**.
2.  **The "Safe List" Check:** Compare `translator_name` against a `safe_translators.json` allowlist (e.g., Benjamin Jowett, Richard Jebb).
3.  **The "Modern Trap":** If `translator_name` matches a `blocked_translators.json` denylist (modern scholars), mark **HIGH RISK**.

### 3.3 The "Audit Log"
Generate a `copyright_audit.csv` report:
```csv
filename, author, translator, year, risk_score, reason
plato_republic.txt, Plato, Jowett, 1892, SAFE, Pre-1930
aurelius_meds.xml, Aurelius, Hays, 2002, HIGH RISK, Post-1930
```

## 4. Technical Implementation
* Script Name: audit_ip_compliance.py
* Libraries: dateutil (parsing fuzzy dates), spacy (optional, for extracting names from unstructured headers).
* Logic Snippet:

```python
def assess_risk(metadata):
    if metadata.year and metadata.year < 1930:
        return "SAFE"
    if "Creative Commons" in metadata.license_text:
        return "SAFE"
    return "REVIEW" # Default fail-safe
```

## 5. Antigravity Tasking Instructions
* Manager: Review the blocked_translators.json list to ensure we aren't accidentally blocking valid CC-BY modern translations.
* Editor: Write the audit_ip_compliance.py script.
* Browser: Research and compile a list of "Public Domain Translators" (e.g., Jowett, Loeb Classical Library Pre-1930) to seed the safe_translators.json.

## 6. Constraints & Fail-Safes
* Zero Trust: If the publication year is missing, default to REVIEW (Yellow). Do not assume it is safe just because it was on a university website.
* Jurisdiction: Hard-code logic for US Copyright Law (Works published before 1930 are PD). Do not try to solve for EU/Global copyright in MVP.