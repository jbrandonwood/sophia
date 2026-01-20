import { StateGraph, START, END } from "@langchain/langgraph";
// import { FirestoreSaver } from "../lib/langgraph/firestore-saver"; // Dynamic import to avoid side effects
import { AgentState, AgentStateAnnotation } from "./state";
import { analystNode } from "./nodes/analyst";
import { librarianNode } from "./nodes/librarian";
import { interlocutorNode } from "./nodes/interlocutor";
import { criticNode } from "./nodes/critic";
import { synthesizerNode } from "./nodes/synthesizer";

// --- Lazy Singleton ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let compiledApp: any = null;

export async function getApp(checkpointer?: unknown) {
    if (compiledApp && !checkpointer) return compiledApp;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let saver: any = checkpointer;
    if (!saver) {
        const { FirestoreSaver } = await import("../lib/langgraph/firestore-saver");
        saver = new FirestoreSaver();
    }

    // --- Conditional Edges ---

    const routeAnalyst = (state: AgentState) => {
        const move = state.socratic_move;
        console.log(`Router (Analyst): Move is ${move}`);

        if (move === "SYNTHESIZE") {
            return "synthesizer";
        }

        // If we need context, go to Librarian
        if (move === "EXAMINE" || move === "CHALLENGE") {
            if (state.search_query && state.search_query.length > 2) {
                return "librarian";
            }
        }

        // Default: Go to Critic for internal monologue
        return "critic";
    };

    // --- Graph Construction ---

    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode("analyst", analystNode)
        .addNode("librarian", librarianNode)
        .addNode("interlocutor", interlocutorNode)
        .addNode("critic", criticNode)
        .addNode("synthesizer", synthesizerNode)

        // Start -> Analyst
        .addEdge(START, "analyst")

        // Analyst -> Router -> Librarian / Synthesizer / Critic
        .addConditionalEdges("analyst", routeAnalyst)

        // Librarian -> Critic
        .addEdge("librarian", "critic")

        // Critic -> Interlocutor
        .addEdge("critic", "interlocutor")

        // Interlocutor -> End
        .addEdge("interlocutor", END)

        // Synthesizer -> End (Synthesizer is the last speaker in its branch)
        .addEdge("synthesizer", END);

    const app = workflow.compile({ checkpointer: saver });

    if (!checkpointer) {
        compiledApp = app;
    }

    return app;
}
