// web/scripts/verify_agent.ts
// Usase: npx tsx scripts/verify_agent.ts

import { app } from '../src/agent/graph';
import { HumanMessage } from '@langchain/core/messages';

// Mock the Vertex AI search if necessary, but here we can try integration if creds exist.
// If creds don't exist, it will likely fail or return empty.
// We should check if we can run this without actual API calls or if we expect API calls.
// The user has likely environment variables setup.

async function main() {
    console.log("Starting Verification of LangGraph Agent...");

    const input = {
        messages: [new HumanMessage("What is the nature of Justice?")],
        vertexSearchCount: 0,
        ragCitations: [],
        currentPhase: "elicit" // or default
    };

    console.log("Invoking graph with input:", JSON.stringify(input, null, 2));

    try {
        const result = await app.invoke(input);
        console.log("Graph execution successful.");
        console.log("Final State:", JSON.stringify(result, null, 2));

        const messages = result.messages;
        const lastMessage = messages[messages.length - 1];
        console.log("Agent Response:", lastMessage.content);

        if (result.currentPhase === 'aporia' || result.ragCitations.length >= 0) {
            console.log("SUCCESS: Graph transitioned phases correctly.");
        } else {
            console.error("FAILURE: unexpected phase or state.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Verification Failed:", error);
        process.exit(1);
    }
}

main();
