import dotenv from 'dotenv';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Tests Vertex AI model access via raw REST API.
 */
async function main() {
    console.log("Testing Model Access via raw REST...");
    try {
        const project = process.env.GOOGLE_VERTEX_PROJECT_ID || "sophia-484006";
        const location = "us-central1";
        const model = "gemini-1.5-pro-002";

        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

        console.log(`Endpoint: ${endpoint}`);

        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error("Failed to get access token");
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Say hello' }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 10
                }
            })
        });

        const data = await response.json() as Record<string, unknown>;
        if (response.ok) {
            console.log("SUCCESS! Response:", JSON.stringify(data, null, 2));
        } else {
            console.error(`FAILED (${response.status}):`, JSON.stringify(data, null, 2));
        }

    } catch (error: unknown) {
        console.error("Script Error:", error);
    }
}

main();
