import dotenv from 'dotenv';
import path from 'path';
import { ChatGoogleVertexAI } from "@langchain/google-vertexai";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * Specifically tests the titling model configuration.
 */
async function main() {
    console.log("Testing Titling Model Configuration...");
    try {
        const scenarios = [
            { model: "gemini-1.5-flash", location: "us-central1" },
            { model: "gemini-1.5-pro", location: "us-central1" }
        ];

        const project = process.env.GOOGLE_VERTEX_PROJECT_ID || "sophia-484006";

        for (const s of scenarios) {
            console.log(`Checking ${s.model} in ${s.location}...`);
            try {
                const chat = new ChatGoogleVertexAI({
                    model: s.model,
                    location: s.location,
                    // @ts-expect-error - project property is not in the type definition but is needed for the SDK
                    project: project,
                    temperature: 0.1,
                    maxOutputTokens: 10,
                });

                const res = await chat.invoke("Create a 2 word title for: 'What is justice?'");
                console.log(` SUCCESS: ${s.model} -> "${res.content.toString().trim()}"`);
            } catch (e: unknown) {
                console.log(` FAILED: ${s.model} - ${(e as Error).message || e}`);
            }
        }
    } catch (error: unknown) {
        console.error("Test Script Error:", error);
    }
}

main();
