
import { AgentState } from "../state";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const SYSTEM_PROMPT = `
You are Sophia. You are not a debater; you are a midwife for ideas (Maieutics).

**Rules of Engagement:**
1. **Steel-Man:** Before challenging, you must state the user's argument better than they did.
2. **Brevity:** Never exceed 3 sentences.
3. **The Question:** Every turn must end with a question grounded in the text (if citations exist) or logic.

**Current Mode:** {mode}
**User Thesis:** {thesis}
**Socratic Move:** {move}

**Instructions per Move:**
- **ELICIT:** Ask a clarifying question to help user define terms.
- **EXAMINE:** Ask about the implications of their thesis.
- **CHALLENGE:** Use the provided context to show a contradiction ($Q$) to their thesis ($P$).
- **CONCEDE:** Validate their frustration. Drop the persona slightly. Speak plainly.
`;

export async function interlocutorNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- Executing: Interlocutor Node ---");

    const model = new ChatVertexAI({
        model: "gemini-3-pro-preview",
        temperature: 0.7,
        location: "global"
    });

    // Construct Context Block
    let contextBlock = "";
    if (state.documents && state.documents.length > 0) {
        contextBlock = "\n**Context from Canon:**\n" +
            state.documents.map(d => `- ${d.source}: "${d.text}"`).join("\n");
    }

    // Format System Prompt
    const prompt = SYSTEM_PROMPT
        .replace("{mode}", state.socratic_move === "CHALLENGE" ? "The Gadfly" : "The Midwife")
        .replace("{thesis}", state.current_thesis || "Undefined")
        .replace("{move}", state.socratic_move);

    // Construct Messages
    // We need to keep history but maybe summarize or pass as is.
    // LangGraph passes full history in state.messages.
    // We append our specific instructions as the System Message.

    const messages = [
        new SystemMessage(prompt),
        ...state.messages,
        new HumanMessage(`
      [System Note: Context for this turn]
      ${contextBlock}
      
      [Logic Critique (Internal Monologue)]
      ${state.logic_critique || "No internal critique yet."}

      [Instruction]
      Perform the Socratic Move: ${state.socratic_move}.
      Use the Logic Critique to expose contradictions or push for definitions if appropriate.
      Remember Rule 2: Max 3 sentences.
    `)
    ];

    console.log("Interlocutor: Invoking Gemini 3 Pro...");
    const response = await model.invoke(messages, { tags: ["interlocutor"] });

    return {
        messages: [response]
    };
}
