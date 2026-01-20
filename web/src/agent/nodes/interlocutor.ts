import { ChatVertexAI } from "@langchain/google-vertexai";
import { AgentState } from "../state";

export async function InterlocutorNode(state: AgentState) {
    console.log("--- INTERLOCUTOR NODE ---");
    const { messages, ragCitations } = state;

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.7,
        location: 'global'
    });

    const context = ragCitations?.map(c => `[Source: ${c.source}] ${c.text}`).join("\n\n") || "No contextual citations available.";

    const prompt = `
    You are Sophia, the Socratic Interlocutor. 
    Engage the user in a dialogue aimed at uncovering the truth.
    
    Use the following citations from the philosophical corpus to inform your questioning:
    ${context}
    
    Guidelines:
    1. Do not lecture. 
    2. Ask short, pointed questions that expose contradictions.
    3. Stay in the persona of a wise, curious companion.
    `;

    const response = await model.invoke([
        ...messages,
        { role: "system", content: prompt }
    ]);

    return {
        messages: [response],
        currentPhase: 'aporia'
    };
}
