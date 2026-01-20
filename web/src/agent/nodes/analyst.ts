
import { AgentState } from "../state";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage } from "@langchain/core/messages";

const ANALYST_PROMPT = `
You are the ANALYST module of Sophia, a Socratic Agent.
Your role is to "Orient" the conversation (OODA Loop). You do NOT speak to the user.

**Input:** 
- Full conversation history
- Current Thesis: {current_thesis}
- Current Frustration Level: {frustration_level}

**Your Tasks:**
1. **Analyze Thesis:** Has the user stated a clear premise/definition? If yes, extract it. If they modified it, track the change.
2. **Analyze Sentiment:** Detect if the user is "curious", "defensive" (annoyed at questioning), or "fatigued" (wants to end).
3. **Decide Socratic Move:**
   - **ELICIT:** If thesis is unclear or not yet stated.
   - **EXAMINE:** If thesis is clear but needs context/grounding.
   - **CHALLENGE:** If thesis is clear and we have context, proceed to Gadfly mode.
   - **CONCEDE:** If user is "defensive" OR Frustration > 7.
   - **SYNTHESIZE:** If user says "I don't know", admits defeat, or conversation has circled 3+ times.
4. **Generate Search Query:** What concept do we need to look up in the Canon to address the user's latest input?

**Output Format (JSON Only):**
{
  "new_thesis": "string (or null if unchanged)",
  "thesis_evolution_entry": "string (log entry or null)",
  "user_sentiment": "curious" | "defensive" | "fatigued",
  "frustration_delta": number (-1 to +2),
  "socratic_move": "ELICIT" | "EXAMINE" | "CHALLENGE" | "CONCEDE" | "SYNTHESIZE",
  "search_query": "string"
}
`;

interface AnalystResponse {
    new_thesis: string | null;
    thesis_evolution_entry: string | null;
    user_sentiment: "curious" | "defensive" | "fatigued";
    frustration_delta: number;
    socratic_move: "ELICIT" | "EXAMINE" | "CHALLENGE" | "CONCEDE" | "SYNTHESIZE";
    search_query: string;
}

export async function analystNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Analyst Node ---");

    // Skip if last message is AI (shouldn't happen in proper loop, but safety check)
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage._getType() === "ai") {
        return { socratic_move: "ELICIT" }; // Default reset
    }

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.1, // Deterministic
        location: "global",
        responseMimeType: "application/json"
    });

    // Prepare Prompt
    const prompt = ANALYST_PROMPT
        .replace("{current_thesis}", state.current_thesis || "None")
        .replace("{frustration_level}", state.frustration_level.toString());

    const response = await model.invoke([
        new SystemMessage(prompt),
        ...state.messages
    ]);

    let analysis: AnalystResponse;
    try {
        const text = typeof response.content === 'string' ? response.content : "";
        analysis = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Analyst JSON", e);
        return { socratic_move: "ELICIT" }; // Fallback
    }

    console.log("Analyst Result:", analysis);

    // Calculate new frustration
    const newFrustration = Math.max(0, Math.min(10, state.frustration_level + (analysis.frustration_delta || 0)));

    // Force Concede if high frustration
    let finalMove = analysis.socratic_move;
    if (newFrustration > 7 && finalMove !== "SYNTHESIZE") {
        console.log("Analyst: Frustration high, overriding to CONCEDE");
        finalMove = "CONCEDE";
    }

    return {
        current_thesis: analysis.new_thesis || state.current_thesis,
        thesis_evolution: analysis.thesis_evolution_entry ? [analysis.thesis_evolution_entry] : [],
        user_sentiment: analysis.user_sentiment,
        frustration_level: newFrustration,
        socratic_move: finalMove,
        search_query: analysis.search_query
    };
}
