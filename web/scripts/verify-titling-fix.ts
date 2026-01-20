import { generateConversationTitle } from "../src/lib/ai/titling";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars for the script (Vertex AI credentials)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function verify() {
    const testCaptions = [
        "What is the meaning of life in the face of death?",
        "How do we know that we are not dreaming right now?",
        "Is justice merely the interest of the stronger?",
        "Can virtue be taught or is it innate?"
    ];

    console.log("--- TITLING VERIFICATION ---");
    for (const caption of testCaptions) {
        console.log(`Input: "${caption}"`);
        try {
            const title = await generateConversationTitle(caption);
            console.log(`Result: [${title}]`);
            console.log("---");
        } catch (e: unknown) {
            console.error(`FAILED for "${caption}":`, (e as Error).message || e);
        }
    }
}

verify();
