
import { AgentState } from "../state";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const CRITIC_PROMPT = `
You are the CRITIC. Your job is to ensure Sophia's responses meet the "Maieutic Standard".

**The Standard:**
1. **Length:** Must be < 5 sentences. Ideal is 2-3.
2. **The Question:** Must end with a question (unless SYNTHESIZE mode).
3. **Format:** No lists, no bullet points (unless SYNTHESIZE mode).
4. **Tone:** No "I hope this helps" or "Great question". Pure dialectic.

**Input:**
- Socratic Move: {move}
- Latest Response: "{response}"

**Task:**
Evaluate the response.
If it fails, return a JSON object with "status": "REJECT" and "feedback": "instruction".
If it passes, return "status": "APPROVE".

**Output (JSON Only):**
{
  "status": "APPROVE" | "REJECT",
  "feedback": "string (only if REJECT)"
}
`;

export async function criticNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Critic Node ---");

    // Skip critique for SYNTHESIZE move as it has different rules
    if (state.socratic_move === "SYNTHESIZE") {
        return { critic_failures: 0 };
    }

    const lastMessage = state.messages[state.messages.length - 1];
    const responseText = typeof lastMessage.content === 'string' ? lastMessage.content : "";

    // Hard rule check (save LLM call if obvious)
    if (responseText.length > 1000) {
        console.log("Critic: Automatically rejecting due to excessive length.");
        return {
            critic_failures: state.critic_failures + 1,
            messages: [new AIMessage("Consider the previous response too long. Re-draft it to be under 3 sentences.")]
        };
    }

    const model = new ChatVertexAI({
        model: "gemini-3-flash-preview",
        temperature: 0.1,
        location: "global",
        responseMimeType: "application/json"
    });

    const prompt = CRITIC_PROMPT
        .replace("{move}", state.socratic_move)
        .replace("{response}", responseText.replace(/"/g, '\\"')); // Basic escaping

    const critique = await model.invoke([new HumanMessage(prompt)]);

    try {
        const result = JSON.parse(typeof critique.content === 'string' ? critique.content : "{}");
        console.log("Critic Result:", result);

        if (result.status === "REJECT") {
            // If we fail too many times, just give up and let it pass to avoid infinite loop
            if (state.critic_failures >= 2) {
                console.log("Critic: Too many failures. Overriding to APPROVE.");
                return { critic_failures: 0 };
            }

            return {
                critic_failures: state.critic_failures + 1,
                // We append a system message or a "tool" message to guide the next generation?
                // LangGraph logic: We loop back to "Interlocutor".
                // We need to convey the feedback.
                // Actually, simply adding a HumanMessage with feedback might be best, but that messes up history.
                // Better to replace the last message? Or just let the Interlocutor see the feedback?
                // Let's rely on the graph structure to handle the loop back.
                // We will add a "critique" message to history that Analyst/Interlocutor will see?
                // No, Analyst runs first.
                // We should probably just pass the feedback as a temporary state or message.
                // Let's add a "System" message to the history for the NEXT turn of Interlocutor.
                messages: [new SystemMessage(`[CRITIC FEEDBACK]: ${result.feedback}. Rewrite the previous response.`)]
            };
        }

        return { critic_failures: 0 };

    } catch (e) {
        console.error("Critic JSON Parse Error", e);
        return { critic_failures: 0 }; // Pass on error
    }
}
