import { DocumentServiceClient } from '@google-cloud/discoveryengine'.v1alpha;
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Environment Variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Configuration
const PROJECT_ID = process.env.GOOGLE_VERTEX_PROJECT_ID || 'sophia-484006';
const LOCATION = 'global';
const COLLECTION_ID = 'default_collection';
const DATA_STORE_ID = process.env.VERTEX_SEARCH_DATA_STORE_ID || 'sophia-kb-v1';

// The GCS URI of the NDJSON file you uploaded
// UPDATE THIS to your specific file in the bucket
const GCS_URI = 'gs://sophia-corpus-dev/sophia_corpus_latest.json';

async function main() {
    console.log("Initializing Vertex AI Import...");

    const client = new DocumentServiceClient();
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION_ID}/dataStores/${DATA_STORE_ID}/branches/default_branch`;

    console.log(`Starting Import from ${GCS_URI} to ${parent}...`);
    try {
        const [operation] = await client.importDocuments({
            parent,
            gcsSource: {
                inputUris: [GCS_URI]
            },
            reconciliationMode: 'INCREMENTAL'
        });

        console.log("Import Operation Initiated:", operation.name);
        console.log("The import process runs asynchronously on Google Cloud.");
        console.log("You can check status in the GCP Console or via gcloud.");
    } catch (e: any) {
        console.error("Import failed with error:", e);
        // Special cleanup log
        if (e.message?.includes('ensure that the DataStore is created')) {
            console.error("Hint: DataStore might not be ready yet.");
        }
        process.exit(1);
    }
}

main().catch(console.error);
