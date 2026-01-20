import { ChatVertexAI } from "@langchain/google-vertexai";
import { AgentState } from "../state";

export async function CriticNode(state: AgentState) {
    console.log("--- CRITIC NODE ---");
    const { messages } = state;

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.7,
        location: 'global'
    });

    const prompt = `
    You are the Critic. Your role is to find inconsistencies in the user's logic.
    Be polite but firm. Point out contradictions without giving the answer.
    `;

    const response = await model.invoke([
        ...messages,
        { role: "system", content: prompt }
    ]);

    return {
        messages: [response]
    };
}
