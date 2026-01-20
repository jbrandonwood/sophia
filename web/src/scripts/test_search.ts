
import { searchPhilosophicalCorpus } from "../lib/vertex";

async function testSearch() {
    console.log("Testing Vertex AI Search...");
    try {
        const results = await searchPhilosophicalCorpus("What is the nature of justice?", 3);
        console.log("Search Results:", JSON.stringify(results, null, 2));
    } catch (error) {
        console.error("Search Failed:", error);
    }
}

testSearch();
