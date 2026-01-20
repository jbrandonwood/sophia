
import { AgentState } from "../state";
import { searchPhilosophicalCorpus } from "@/lib/vertex";

export async function librarianNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Librarian Node ---");

    const query = state.search_query;

    if (!query) {
        console.log("Librarian: No search query provided by Analyst. Skipping search.");
        return { documents: [] };
    }

    console.log(`Librarian: Searching for "${query}"...`);

    // We only search once per turn usually, but state has all docs.
    // The Analyst determines if we need context.
    // We'll search and replace the documents in state (focusing on current turn).

    try {
        const results = await searchPhilosophicalCorpus(query, 0); // Count handled by Analyst flow, effectively. 
        // Actually vertex.ts has a counter check, passing 0 to bypass it since Analyst controls when to search.

        console.log(`Librarian: Found ${results.citations.length} results.`);

        return {
            documents: results.citations
        };
    } catch (error) {
        console.error("Librarian: Search failed", error);
        return { documents: [] };
    }
}
