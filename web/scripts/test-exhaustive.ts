import dotenv from 'dotenv';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Exhaustive sweep of models and locations to find accessible endpoints.
 */
async function main() {
    try {
        const project = process.env.GOOGLE_VERTEX_PROJECT_ID || "sophia-484006";
        const scenarios = [
            { model: "gemini-1.5-flash", loc: "us-central1" },
            { model: "gemini-1.5-pro", loc: "us-central1" },
            { model: "gemini-1.5-flash-001", loc: "us-central1" },
            { model: "gemini-1.5-pro-001", loc: "us-central1" },
            { model: "gemini-1.5-flash-002", loc: "us-central1" },
            { model: "gemini-1.5-pro-002", loc: "us-central1" },
            { model: "gemini-1.5-pro-preview-0514", loc: "us-central1" },
            { model: "gemini-1.5-flash", loc: "us-east4" },
            { model: "gemini-1.5-flash", loc: "europe-west1" },
        ];

        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        for (const s of scenarios) {
            const endpoint = `https://${s.loc}-aiplatform.googleapis.com/v1/projects/${project}/locations/${s.loc}/publishers/google/models/${s.model}:generateContent`;
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'a' }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                });
                if (response.ok) {
                    console.log(`SUCCESS: ${s.model} in ${s.loc}`);
                    return; // Stop at first success
                } else {
                    const data = await response.json() as { error?: { message?: string } };
                    console.log(`FAIL: ${s.model} in ${s.loc} (${response.status}) - ${data.error?.message?.substring(0, 50)}`);
                }
            } catch (e: unknown) {
                console.log(`ERR: ${s.model} in ${s.loc}: ${(e as Error).message || e}`);
            }
        }

    } catch (error: unknown) {
        console.error("Script Error:", error);
    }
}

main();
