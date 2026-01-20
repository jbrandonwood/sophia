import { StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { firestoreSaver } from "../lib/langgraph/firestore-instance";
import { analystNode } from "./nodes/analyst";
import { interlocutorNode } from "./nodes/interlocutor";

/**
 * Definition of the Sophia Agent State.
 * Extends the default LangGraph MessagesAnnotation with context-specific fields.
 */
export const AgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    /** Current phase of the Socratic dialogue */
    currentPhase: Annotation<"elicit" | "examine" | "challenge" | "concede" | "aporia">({
        reducer: (x, y) => y ?? x,
        default: () => "elicit",
    }),
    /** Citations retrieved from the philosophical corpus */
    ragCitations: Annotation<Array<{ source: string; text: string; uri?: string }>>({
        reducer: (x, y) => y ?? x,
        default: () => [],
    }),
});

/**
 * The Compiled State Graph for the Sophia Agent.
 * Orchestrates the flow between Analysis (Analyst) and Dialogue (Interlocutor).
 */
const builder = new StateGraph(AgentState)
    .addNode("analyst", analystNode)
    .addNode("interlocutor", interlocutorNode)
    .addEdge("__start__", "analyst")
    .addEdge("analyst", "interlocutor")
    .addEdge("interlocutor", "__end__");

// Reverting to any for the saver type to satisfy the BaseCheckpointSaver generic constraints
// while maintaining the firestoreSaver singleton usage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const app = builder.compile({ checkpointer: firestoreSaver as any });
