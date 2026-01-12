# Feature Spec: Perseus Digital Library Local Mirror Ingestion

## 1. Objective
Build a robust, scalable script to clone and maintain a local mirror of the Perseus Digital Library’s primary source texts. The goal is to obtain raw TEI XML files for Greek, Latin, and English translations while maintaining the Canonical Text Services (CTS) URN directory structure.

## 2. Target Sources
The script should target the following GitHub repositories within the `PerseusDL` organization:
* **Greek:** `https://github.com/PerseusDL/canonical-greekLit`
* **Latin:** `https://github.com/PerseusDL/canonical-latinLit`
* **English/Modern:** `https://github.com/PerseusDL/canonical-engLit`
* **Reference/Lexica:** `https://github.com/PerseusDL/lexica`

## 3. Functional Requirements

### 3.1 Efficient Ingestion
* **Cloning Strategy:** Perform a `git clone --depth 1` (shallow clone) to minimize disk usage and network overhead. We only need the latest state of the texts, not the historical commit logs.
* **Storage Pathing:** Maintain the repository-defined folder structure (e.g., `data/[TEXTGROUP]/[WORK]/[FILE].xml`) to preserve metadata.

### 3.2 Filtering & Scope
* **File Types:** Target only `.xml` files. Exclude images, binary assets, and web-specific config files (e.g., `.xar`, `.xsl`).
* **Validation:** The script must verify that the `data/` directory exists in each repo before attempting to process.

### 3.3 Inventory Generation
* **Manifest Creation:** Upon completion, generate a `manifest.json` file that lists:
    * Total number of works ingested.
    * Path to each file.
    * Language tag (extracted from the repo name).
    * CTS URN (if present in the file metadata).

## 4. Technical Implementation (Script Logic)
1. **Directory Setup:** Create a root directory `/perseus_local_mirror`.
2. **Sequential Sync:** Iterate through the list of target repositories.
3. **Download Loop:**
   - Check if the repository folder exists locally.
   - If **Yes**: Perform `git pull` to get updates.
   - If **No**: Perform `git clone --depth 1`.
4. **Post-Process:** Scan the downloaded directories and compile the `manifest.json`.

## 5. Antigravity Tasking instructions
* **Manager:** Coordinate the cloning sequence and error handling.
* **Editor:** Write the `ingest_perseus.py` script. Use `subprocess` for Git commands or `GitPython`.
* **Browser:** Check the `PerseusDL` GitHub page to ensure no new canonical repos (e.g., Farsi or Hebrew) have been added recently.

## 6. Constraints
* **Disk Space:** Anticipate ~5GB to ~10GB of raw XML data.
* **Rate Limiting:** Ensure the script respects GitHub’s API limits if using the API for discovery; otherwise, standard Git cloning should be fine.