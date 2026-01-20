import dotenv from 'dotenv';
import path from 'path';
import { ChatGoogleVertexAI } from "@langchain/google-vertexai";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log("Testing Streaming with Tags...");
    try {
        const model = new ChatGoogleVertexAI({
            model: "gemini-1.5-flash",
            maxOutputTokens: 20,
        });

        const stream = await model.stream("Say exactly 'Streaming works' with a #tag", {
            tags: ["test-stream"]
        });

        for await (const chunk of stream) {
            process.stdout.write(chunk.content.toString());
        }
        console.log("\nSUCCESS");
    } catch (e: unknown) {
        console.error("FAILED", (e as Error).message || e);
    }
}

main();
