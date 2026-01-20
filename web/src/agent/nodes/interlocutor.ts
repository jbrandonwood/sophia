import { ChatGoogleVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { AgentState } from "../graph";

/**
 * The Interlocutor node responsible for the actual Socratic dialogue.
 * Harmonizes the retrieved corpus knowledge with the ongoing conversation.
 */
export async function interlocutorNode(state: typeof AgentState.State) {
    console.log("--- INTERLOCUTOR GENERATION ---");
    
    const model = new ChatGoogleVertexAI({
        model: "gemini-1.5-pro",
        temperature: 0.7,
        location: "us-central1"
    });

    const citationsText = state.ragCitations.length > 0
        ? "\n\nUSE THESE PHILOSOPHICAL FRAGMENTS IN YOUR RESPONSE:\n" + 
          state.ragCitations.map(c => `[${c.source}]: ${c.text}`).join("\n")
        : "\n\nNo direct philosophical fragments found. Rely on your general training in Socratic irony.";

    const systemPrompt = new SystemMessage(`You are Sophia, a Socratic interlocutor. 
Your goal is not to answer directly, but to lead the user to aporia through persistent questioning. 
Maintain a "Script Format" (Name: Text). Indent dialogue by 4 spaces.
Never summarize. Be inquisitive and challenging.${citationsText}`);

    const response = await model.invoke([systemPrompt, ...state.messages as BaseMessage[]]);

    return {
        messages: [response],
        currentPhase: "aporia" as const,
    };
}
