import { ChatVertexAI } from "@langchain/google-vertexai";
import { AnalystResponse, AgentState } from "../state";

export async function AnalystNode(state: AgentState) {
    console.log("--- ANALYST NODE ---");
    const { messages } = state;

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0, // Strict and logical
        location: 'global'
    });

    const prompt = `
    You are the Analyst of the Digital Stoa.
    Your task is to analyze the user's latest statement and extract the underlying thesis, sentiment, and logical quality.
    
    Return your analysis as a JSON object:
    {
      "thesis": "...",
      "sentiment": "...",
      "quality": 0-1 (float)
    }
    `;

    const response = await model.invoke([
        ...messages,
        { role: "system", content: prompt }
    ]);

    try {
        const content = typeof response.content === 'string' ? response.content : "";
        const analysis = JSON.parse(content) as AnalystResponse;
        return {
            current_thesis: analysis.thesis,
            user_sentiment: analysis.sentiment,
            currentPhase: 'examine'
        };
    } catch (e) {
        console.error("Failed to parse analyst response", e);
        return { currentPhase: 'examine' };
    }
}
