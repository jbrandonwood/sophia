import dotenv from 'dotenv';
import path from 'path';
import { ChatGoogleVertexAI } from "@langchain/google-vertexai";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Tests global connectivity to Vertex AI via LangChain.
 */
async function main() {
    console.log("Testing Global Vertex AI Connectivity...");
    try {
        const model = new ChatGoogleVertexAI({
            model: "gemini-1.5-flash",
            maxOutputTokens: 20,
        });

        const res = await model.invoke("Say 'Sophia is awake'");
        console.log("Response:", res.content);
        console.log("SUCCESS");
    } catch (e: unknown) {
        console.error("Global Test FAILED");
        console.error((e as Error).message || e);
    }
}

main();
