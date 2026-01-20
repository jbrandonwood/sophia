import dotenv from 'dotenv';
import path from 'path';
import { ChatGoogleVertexAI } from "@langchain/google-vertexai";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log("Testing Gemini 3 Experimental...");
    try {
        const model = new ChatGoogleVertexAI({
            model: "gemini-3-flash-preview",
            maxOutputTokens: 20,
            location: "us-central1"
        });

        const res = await model.invoke("Reply with: 'Gemini 3 is active'");
        console.log("Response:", res.content);
        console.log("SUCCESS");
    } catch (e: unknown) {
        console.error("FAILED", (e as Error).message || e);
    }
}

main();
