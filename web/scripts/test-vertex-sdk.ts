import dotenv from 'dotenv';
import path from 'path';
import { generateText } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Tests connectivity using the Vertex AI SDK.
 */
async function main() {
    console.log("Testing Vertex AI SDK Connectivity...");
    try {
        const scenarios = [
            { model: "gemini-1.5-flash", location: "us-central1" },
            { model: "gemini-1.5-pro", location: "us-central1" }
        ];

        for (const s of scenarios) {
            console.log(`Checking ${s.model}...`);
            try {
                const { text } = await generateText({
                    model: vertex(s.model),
                    prompt: 'Say "hello"',
                });
                console.log(`SUCCESS: ${s.model} responded: ${text}`);
            } catch (e: unknown) {
                console.log(`FAILED: ${s.model}`);
                console.error((e as Error).message || e);
            }
        }

    } catch (error: unknown) {
        console.error("Vertex SDK Test Error:", error);
    }
}

main();
