import { searchPhilosophicalCorpus } from "../../lib/ai/search";

async function testSearch() {
  console.log("Searching corpus...");
  const results = await searchPhilosophicalCorpus("What is the nature of justice?", 3);
  console.log("Results:", JSON.stringify(results, null, 2));
}

testSearch().catch(console.error);
