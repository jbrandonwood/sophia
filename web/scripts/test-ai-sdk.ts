import dotenv from 'dotenv';
import path from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Tests connectivity using the Vercel AI SDK.
 */
async function main() {
    console.log("Testing AI SDK (Vercel) Connectivity...");
    try {
        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: 'Say "hello from AI SDK"',
        });
        console.log("Response:", text);
        console.log("SUCCESS");
    } catch (e: unknown) {
        console.error("AI SDK Test FAILED");
        console.error((e as Error).message || e);
    }
}

main();
