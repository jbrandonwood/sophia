import { ChatVertexAI } from "@langchain/google-vertexai";
import { AgentState } from "../state";

export async function SynthesizerNode(state: AgentState) {
    console.log("--- SYNTHESIZER NODE ---");
    const { messages, current_thesis } = state;

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.3,
        location: 'global'
    });

    const prompt = `
    You are the Synthesizer. 
    Analyze the current thesis and the latest dialogue. 
    Refine the thesis if significant progress has been made, or acknowledge the current stalemate.
    
    Current Thesis: ${current_thesis}
    `;

    const response = await model.invoke([
        ...messages,
        { role: "system", content: prompt }
    ]);

    return {
        messages: [response],
        current_thesis: response.content // For now, the response IS the new thesis
    };
}
