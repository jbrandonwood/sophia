import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Lists available models from the Google API for verification.
 */
async function main() {
    console.log("Listing available models...");
    try {
        const project = process.env.GOOGLE_VERTEX_PROJECT_ID || "sophia-484006";
        const location = "us-central1";
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models`;

        // Using simple fetch for verification
        const response = await fetch(endpoint);
        const data = await response.json() as { models?: { name: string }[] };

        if (data.models) {
            data.models.forEach(m => console.log(` - ${m.name}`));
        } else {
            console.log("No models found or error in response.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e: unknown) {
        console.error("Failed to list models:", (e as Error).message || e);
    }
}

main();
