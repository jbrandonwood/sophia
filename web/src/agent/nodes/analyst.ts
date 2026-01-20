import { searchPhilosophicalCorpus } from "../../lib/ai/search";
import { AgentState } from "../graph";

interface AnalystResponse {
    query: string;
    shouldSearch: boolean;
}

/**
 * The Analyst node responsible for classifying user intent and retrieving logic.
 * Decides whether to query the philosophical corpus or proceed with pure dialogue.
 */
export async function analystNode(state: typeof AgentState.State) {
    console.log("--- STARTING ANALYSIS ---");
    const lastMessage = state.messages[state.messages.length - 1];
    
    // Default search logic: if it's not a short greeting, search.
    // In production, this would be a small LLM call to generate a search query.
    const userText = lastMessage.content.toString();
    const isQuestion = userText.includes("?") || userText.length > 20;

    let citations: Array<{ source: string; text: string; uri?: string }> = [];
    
    if (isQuestion) {
        console.log(`Searching corpus for: "${userText.substring(0, 50)}..."`);
        const results = await searchPhilosophicalCorpus(userText, 3);
        citations = results.map(r => ({
            source: r.title,
            text: r.text,
            uri: r.uri
        }));
    }

    return {
        ragCitations: citations,
        currentPhase: citations.length > 0 ? "examine" : "elicit",
    };
}
