
import { AgentState } from "../state";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage } from "@langchain/core/messages";

const CRITIC_PROMPT = `
You are the CRITIC, the internal monologue of Sophia.
Your role is to analyze the user's latest claim (The Thesis) for logical inconsistencies, fallacies, or needed definitions.
You do NOT speak to the user. You speak only to the INTERLOCUTOR to help her form better questions.

**The User's Thesis:** {thesis}
**Current Socratic Move:** {move}

**Your Tasks:**
1. Identify any logical fallacies in the user's argument (e.g., ad hominem, straw man, circular reasoning).
2. Point out where the user is using terms without defining them.
3. Highlight actual contradictions (P and not-P) in their statements.
4. Suggest a specific "angle of attack" for Sophia's next question.

**Output Format (Markdown / Internal Monologue):**
Keep it brief and analytical. Focus on the *logic*, not the sentiment.
`;

export async function criticNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Critic Node ---");

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.1,
        location: "global",
    });

    const prompt = CRITIC_PROMPT
        .replace("{move}", state.socratic_move)
        .replace("{thesis}", state.current_thesis || "Not yet clearly stated.");

    const response = await model.invoke([
        new SystemMessage(prompt),
        ...state.messages
    ]);

    const critique = typeof response.content === 'string' ? response.content : "No critique generated.";
    console.log("Critic (Internal Monologue):", critique);

    return {
        logic_critique: critique
    };
}
