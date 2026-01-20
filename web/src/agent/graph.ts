import { StateGraph, START, END } from "@langchain/langgraph";
// import { FirestoreSaver } from "../lib/langgraph/firestore-saver"; // Dynamic import to avoid side effects
import { AgentState, AgentStateAnnotation } from "./state";
import { analystNode } from "./nodes/analyst";
import { librarianNode } from "./nodes/librarian";
import { interlocutorNode } from "./nodes/interlocutor";
import { criticNode } from "./nodes/critic";
import { synthesizerNode } from "./nodes/synthesizer";

// --- Lazy Singleton ---
let compiledApp: any = null;

export async function getApp(checkpointer?: any) {
    if (compiledApp && !checkpointer) return compiledApp;

    let saver = checkpointer;
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
        // Moves that need context: EXAMINE, CHALLENGE
        // Moves that do not: ELICIT, CONCEDE (often personal/clarification)
        if (move === "EXAMINE" || move === "CHALLENGE") {
            // Only if we actually have a query.
            if (state.search_query && state.search_query.length > 2) {
                return "librarian";
            }
        }

        // Default: Go directly to speaking
        return "interlocutor";
    };

    const routeCritic = (state: AgentState) => {
        // If the Critic rejected, it added feedback to state.messages (handled in critic node)
        // If it returns, we check if we should loop or end.

        // Actually, my Critic implementation returns `critic_failures`.
        // If feedback was added, we probably want to loop back to Interlocutor.
        // How do we know if it was rejected?
        // We can check if the last message is a SystemMessage (Feedback). Or check a flag?
        // Let's use `critic_failures`. If it increased > 0 (modulo reset), implies rejection.
        // But `criticNode` might reset it if it forces approval.

        // Let's inspect the last message:
        // If it starts with [CRITIC FEEDBACK], loop back.
        const lastMsg = state.messages[state.messages.length - 1];
        const content = typeof lastMsg.content === 'string' ? lastMsg.content : "";

        if (content.startsWith("[CRITIC FEEDBACK]")) {
            console.log("Router (Critic): Rejection detected. Looping back to Interlocutor.");
            return "interlocutor"; // Loop
        }

        console.log("Router (Critic): Approval. Ending turn.");
        return END;
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

        // Analyst -> Router -> Librarian / Interlocutor / Synthesizer
        .addConditionalEdges("analyst", routeAnalyst)

        // Librarian -> Interlocutor
        .addEdge("librarian", "interlocutor")

        // Interlocutor -> Critic
        .addEdge("interlocutor", "critic")

        // Critic -> Router -> Interlocutor / End
        .addConditionalEdges("critic", routeCritic)

        // Synthesizer -> End
        .addEdge("synthesizer", END);

    const app = workflow.compile({ checkpointer: saver });

    if (!checkpointer) {
        compiledApp = app;
    }

    return app;
}
