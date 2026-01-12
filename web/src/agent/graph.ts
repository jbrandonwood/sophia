import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { searchPhilosophicalCorpus, Citation } from "../lib/vertex";
import { vertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";

// --- Configuration ---
// Using Vertex AI with Gemini Experimental (targeting latest/Gemini 3)
const SOPHIA_SYSTEM_PROMPT = `
You are Sophia, a Socratic Interlocutor.
Your goal is NOT to answer questions directly, but to guide the user to examine their own premises through the Socratic method (Elicit -> Examine -> Aporia).

**Core Rules:**
1. **No Summaries**: Never summarize the text.
2. **Hard Citations**: You must base your challenges on the provided Context.
3. **Dialogue Format**: You are speaking in a dialogue. Be concise but deep.
4. **Style**: Use a "Digital Stoa" tone—philosophical, rigorous, yet accessible.

**Context Usage**:
Use the provided [Context] quotes to challenge the user's view. 
If a quote contradicts the user, gently point it out using the format: "But consider [Author] in [Work]: '...'".
`;

// --- State Definition ---
const AgentStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    currentPhase: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "elicit",
    }),
    vertexSearchCount: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0,
    }),
    ragCitations: Annotation<Citation[]>({
        reducer: (x, y) => y,
        default: () => [],
    }),
});

type AgentState = typeof AgentStateAnnotation.State;

// --- Nodes ---

async function examineNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage._getType() === "ai") {
        return {};
    }

    const query = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    const results = await searchPhilosophicalCorpus(query, state.vertexSearchCount);

    return {
        vertexSearchCount: state.vertexSearchCount + 1,
        ragCitations: results.citations,
        currentPhase: 'examine'
    };
}

async function aporiaNode(state: AgentState): Promise<Partial<AgentState>> {
    const citations = state.ragCitations;
    const lastMessage = state.messages[state.messages.length - 1];
    const userText = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    let contextBlock = "";
    if (citations.length > 0) {
        contextBlock = "Context from the Philosophical Corpus:\n";
        citations.forEach(cit => {
            contextBlock += `- ${cit.source}: "${cit.text}"\n`;
        });
    } else {
        contextBlock = "No specific text found in the corpus. Rely on general philosophical reasoning (Plato/Stoicism).";
    }

    try {
        const { text } = await generateText({
            model: vertex("gemini-experimental"), // Targeting latest/v3 via experimental
            system: SOPHIA_SYSTEM_PROMPT,
            prompt: `
Context:
${contextBlock}

User Input:
"${userText}"

Sophia's Response:
        `,
        });

        return {
            messages: [new AIMessage(text)],
            currentPhase: 'aporia'
        };

    } catch (error) {
        console.error("LLM Generation Error:", error);
        return {
            messages: [new AIMessage("I am contemplating... (Error in reasoning engine)")],
            currentPhase: 'aporia'
        };
    }
}

// --- Graph Construction ---
const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("examine", examineNode)
    .addNode("aporia", aporiaNode)
    .addEdge(START, "examine")
    .addEdge("examine", "aporia")
    .addEdge("aporia", END);

import { FirestoreSaver } from "../lib/langgraph/firestore-saver";

const checkpointer = new FirestoreSaver();

export const app = workflow.compile({ checkpointer });
