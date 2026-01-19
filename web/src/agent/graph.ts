
import { StateGraph } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { searchPhilosophicalCorpus } from "@/lib/vertex";
import { FirestoreSaver } from "@/lib/langgraph/firestore-saver";
import { auth } from "google-auth-library";

// --- Types ---
interface AgentState {
    messages: BaseMessage[];
    draftResponse?: string;
    iterations: number;
    // New: Explicitly track citations for the final response
    context?: string[]; 
}

// --- Configuration ---
const PROJECT_ID = process.env.GOOGLE_VERTEX_PROJECT_ID;
// We use a high-intelligence model for the core reasoning
const MODEL_NAME = "gemini-1.5-pro-002"; 

if (!PROJECT_ID) {
    throw new Error("GOOGLE_VERTEX_PROJECT_ID is not set.");
}


// --- Models ---
// Primary Reasoning Model (The Philosopher)
const model = new ChatGoogleGenerativeAI({
    modelName: MODEL_NAME,
    maxOutputTokens: 1024,
    temperature: 0.7, // Slightly creative but grounded
    authOptions: {
        credentials: {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY,
        }
    }
});


// --- Prompts ---
const SYSTEM_PROMPT = `
You are Sophia, a Socratic interlocutor residing in the Digital Stoa.
Your goal is not to answer questions, but to examine the user's beliefs (doxa) to reveal contradictions (aporia) or deeper truths (aletheia).

CORE PRINCIPLES:
1.  **Question > Answer**: Rarely give direct advice. Ask probing questions.
2.  **Brevity**: Be concise, like an early Platonic dialogue. 1-3 sentences max usually.
3.  **Citation**: You rely on the Great Texts. When you speak, you must ground your inquiry in the philosophical corpus.
4.  **Tone**: Serious, academic, but benevolent. You are a midwife for the soul (maieutics).
5.  **Aesthetics**: You value beauty in thought and language.

THE LOOP:
- If the user makes a claim -> Ask for the definition of terms.
- If the user defines a term -> Challenge it with a counter-example from history/literature.
- If the user is confused (Aporia) -> Offer a "myth" or a specific citation to guide them out.

CONTEXT:
You have access to a RAG system (Vector Search) containing the Western Canon.
When you receive context, USE IT to frame your questions.
Cite the source explicitly if relevant (e.g., "As Marcus Aurelius notes...").
`;

// --- Nodes ---

// 1. Retrieval Node
async function retrieve(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content as string;

    console.log(`[Sophia] Retrieving context for: "${query.substring(0, 50)}..."`);
    
    // Search Vector Store
    const results = await searchPhilosophicalCorpus(query, 3);
    
    const contextStrings = results.citations.map(c => 
        `[SOURCE: ${c.source}]\n"${c.text}"`
    );

    return {
        context: contextStrings
    };
}

// 2. Generation Node
async function generate(state: AgentState): Promise<Partial<AgentState>> {
    const contextBlock = state.context && state.context.length > 0
        ? `\n\nRELEVANT PHILOSOPHICAL TEXTS:\n${state.context.join("\n\n")}\n\nINSTRUCTION: Incorporate at least one insight from these texts into your Socratic questioning.`
        : "";

    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT + contextBlock),
        ...state.messages
    ]);

    return {
        messages: [response],
        iterations: state.iterations + 1
    };
}

// --- Graph Definition ---

// 1. Initialize State
const graph = new StateGraph<AgentState>({
    channels: {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => [],
        },
        draftResponse: {
            value: (x: string, y: string) => y,
            default: () => undefined,
        },
        iterations: {
            value: (x: number, y: number) => y,
            default: () => 0,
        },
        context: {
            value: (x: string[], y: string[]) => y,
            default: () => [],
        }
    }
});

// 2. Add Nodes
graph.addNode("retrieve", retrieve);
graph.addNode("generate", generate);

// 3. Define Edges
graph.setEntryPoint("retrieve"); // Always search first (Socratic rigour)
graph.addEdge("retrieve", "generate");
graph.addEdge("generate", "__end__"); // Single turn for now

// 4. Persistence
// We need to initialize the checkpointer conditionally to avoid build-time errors
let checkpointer: FirestoreSaver | undefined;

// Lazy loader for the graph
let appInstance: any = null;

export async function getApp() {
    if (appInstance) return appInstance;

    // Server-side only check
    if (typeof window === 'undefined') {
        const { FirestoreSaver } = await import("@/lib/langgraph/firestore-saver");
        const { db } = await import("@/lib/firebase/server");
        
        checkpointer = new FirestoreSaver(db);
    }

    // Compile
    appInstance = graph.compile({
        checkpointer: checkpointer
    });

    return appInstance;
}
