import { db } from "../lib/firebase/server";
import { getApp } from "./src/agent/graph";

async function main() {
    console.log("Starting Debug Admin Setup...");
    try {
        const app = await getApp();
        console.log("Agent App Initialized:", !!app);

        // Test DB access
        const testData = await db.collection("threads").limit(1).get();
        console.log("Test DB access OK, docs found:", testData.docs.length);
    } catch (e: unknown) {
        console.error("Admin setup debug failed:", e);
    }
}

main();
