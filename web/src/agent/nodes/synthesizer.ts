
import { AgentState } from "../state";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const SYNTHESIZER_PROMPT = `
You are the SYNTHESIZER.
The conversation has reached *Aporia* (productive confusion) or the user is fatigued.
Your goal is to provide closure WITHOUT solving the user's problem.

**Tasks:**
1. **Summarize the Arc:** "We started with X, moved to Y, and found contradiction Z."
2. **The Myth/Analogy:** detailed analogy from the Canon (Plato's Cave, The Ship of State, etc.) that maps to this specific struggle.
3. **Reading List:** Recommend 2-3 texts.

**Format:**
- Section 1: The Arc (1 paragraph)
- Section 2: The Myth (1 paragraph, evocative)
- Section 3: Further Reading (Bulleted list)

**Constraint:** Do NOT ask a final question. End with a period.
`;

export async function synthesizerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Synthesizer Node ---");

    const model = new ChatVertexAI({
        model: "gemini-3-pro-preview",
        temperature: 0.7,
        location: "global"
    });

    const prompt = SYNTHESIZER_PROMPT;

    // We provide the full history so it can summarize the arc
    const messages = [
        new SystemMessage(prompt),
        ...state.messages,
        new HumanMessage("Please synthesize our dialogue.")
    ];

    const response = await model.invoke(messages, { tags: ["synthesizer"] });

    return {
        messages: [response],
        socratic_move: "SYNTHESIZE" // Ensure parsing knows we are done
    };
}
