import dotenv from 'dotenv';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log("Testing Model Access via raw REST (with numbers)...");
    try {
        const project = process.env.GOOGLE_VERTEX_PROJECT_ID || "sophia-484006";
        const location = "us-central1";
        const model = "gemini-1.5-pro-002";

        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Count to 3' }] }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        const data = await response.json();
        console.log("SUCCESS! Response:", JSON.stringify(data, null, 2));
    } catch (error: unknown) {
        console.error("Script Error:", error);
    }
}

main();
