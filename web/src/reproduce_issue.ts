
import { app } from './agent/graph';
import { HumanMessage } from '@langchain/core/messages';

async function run() {
    console.log("Starting reproduction script...");
    try {
        const input = {
            messages: [new HumanMessage("What is the meaning of life?")],
            vertexSearchCount: 0,
        };
        console.log("Invoking app...");
        const result = await app.invoke(input);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error invoking app:", e);
    }
}

run();
