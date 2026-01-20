
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { Citation } from "@/lib/vertex";

// --- State Definition ---

export interface AgentState {
    // Standard LangChain History
    messages: BaseMessage[];

    // Logic Tracking (The "Thesis")
    current_thesis: string;          // The user's specific claim
    thesis_evolution: string[];      // Log of how the definition has shifted

    // Meta-Data (The "Vibe")
    user_sentiment: "curious" | "defensive" | "fatigued";
    frustration_level: number;       // 0-10, triggers "Good Will" override

    // Operational
    socratic_move: "ELICIT" | "EXAMINE" | "CHALLENGE" | "CONCEDE" | "SYNTHESIZE";
    search_query: string;            // Synthesized query
    documents: Citation[];           // Grounding artifacts
    logic_critique: string;          // Internal monologue on user's logic
}

// --- Annotation --

export const AgentStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    current_thesis: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    thesis_evolution: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    user_sentiment: Annotation<"curious" | "defensive" | "fatigued">({
        reducer: (x, y) => y,
        default: () => "curious",
    }),
    frustration_level: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    socratic_move: Annotation<"ELICIT" | "EXAMINE" | "CHALLENGE" | "CONCEDE" | "SYNTHESIZE">({
        reducer: (x, y) => y,
        default: () => "ELICIT",
    }),
    search_query: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    documents: Annotation<Citation[]>({
        reducer: (x, y) => y, // Replace documents for each turn
        default: () => [],
    }),
    logic_critique: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
});
