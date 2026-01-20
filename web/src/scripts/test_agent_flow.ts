
import { getApp } from "../agent/graph";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

async function runTest() {
    console.log("=== Starting Agent Flow Verification ===");

    // 1. Initialize with MemorySaver (No Firestore)
    const memory = new MemorySaver();
    const app = await getApp(memory);

    const threadId = "test-thread-" + Date.now();
    const config = { configurable: { thread_id: threadId } };

    // 2. Simulate User Input: "What is Justice?"
    console.log("\n--- Turn 1: User says 'What is Justice?' ---");
    const input1 = {
        messages: [new HumanMessage("What is Justice?")],
        // Initialize default state fields if needed, though Annotation defaults handle it
    };

    let stateSnapshot: any;

    // Run the graph
    const result1 = await app.invoke(input1, config);

    // Inspect State
    stateSnapshot = await app.getState(config);
    console.log("State after Turn 1:");
    console.log(" Current Thesis:", stateSnapshot.values.current_thesis);
    console.log(" Socratic Move:", stateSnapshot.values.socratic_move);
    console.log(" Last Message:", stateSnapshot.values.messages[stateSnapshot.values.messages.length - 1].content);

    // 3. Simulate User Response: "Justice is fairness."
    console.log("\n--- Turn 2: User says 'Justice is fairness.' ---");
    const input2 = {
        messages: [new HumanMessage("Justice is fairness.")]
    };

    const result2 = await app.invoke(input2, config);

    stateSnapshot = await app.getState(config);
    console.log("State after Turn 2:");
    console.log(" Current Thesis:", stateSnapshot.values.current_thesis);
    console.log(" Socratic Move:", stateSnapshot.values.socratic_move);
    console.log(" Search Query:", stateSnapshot.values.search_query);
    console.log(" Last Message:", stateSnapshot.values.messages[stateSnapshot.values.messages.length - 1].content);

    console.log("\n=== Test Complete ===");
}

runTest().catch(e => {
    console.error("Test Failed:", e);
    process.exit(1);
});
