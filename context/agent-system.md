# Agent System: The Socratic Interlocutor

## 1. Design Philosophy
The agent is designed not as a generic chatbot, but as a **Socratic Interlocutor**. It operates in two distinct modes, switching dynamically based on the conversation state and available knowledge.

### The Midwife (Maieutics)
-   **Goal:** Help the user "birth" their own ideas.
-   **Action:** Elicit premises through gentle, clarifying questions.
-   **Trigger:** When no specific philosophical citations are found, or early in the conversation.

### The Gadfly (The Digital Stoa)
-   **Goal:** Induce *Aporia* (philosophical puzzlement) by exposing contradictions.
-   **Action:** Challenge the user's premise with counter-proposals ($Q$) from the Philosophical Canon.
-   **Trigger:** When relevant citations are retrieved from the RAG corpus.

## 2. Architecture
The system is built on **LangGraph**, treating the conversation as a state machine. This allows for deterministic control flow, persistence, and clear separation of concerns between searching ("Examining") and speaking ("Aporia").

### Key Components
-   **Runtime:** Node.js on Google Cloud Run.
-   **Orchestration:** LangGraph (StateGraph).
-   **LLM:** Vertex AI (Gemini 3 / Gemini Experimental).
-   **Memory:** Firestore (via `FirestoreSaver`) for long-term thread persistence.
-   **RAG:** Vertex AI Search (Enterprise) connected to a corpus of philosophical texts.

## 3. State Schema (`AgentState`)
The agent maintains a typed state object throughout the graph execution:

```typescript
interface AgentState {
    messages: BaseMessage[];           // Conversation history (LangChain format)
    currentPhase: string;              // Current node/phase ('elicit', 'examine', 'aporia')
    vertexSearchCount: number;         // Tracking search attempts
    ragCitations: any[];               // Retrieved segments from Vertex AI Search
    responseStyle: 'midwife' | 'gadfly'; // Dynamic persona selector
}
```

## 4. The Graph Workflow
The workflow is a linear pipeline with internal branching logic.

### Nodes

#### 1. `examineNode` (The Janus Router)
-   **Responsibility:** Information Retrieval & Persona Selection.
-   **Logic:**
    1.  Analyzes the last user message.
    2.  Executes a search against the specific philosophical corpus (Vertex AI Search).
    3.  **Routing Decision:**
        -   If **Citations Found** (> 0): Switch `responseStyle` to **'gadfly'**.
        -   If **No Citations**: Switch `responseStyle` to **'midwife'**.
-   **Output:** Updates `ragCitations` and `responseStyle`.

#### 2. `aporiaNode` (The Speaker)
-   **Responsibility:** Response Generation.
-   **Logic:**
    1.  Constructs the context block from `ragCitations`.
    2.  Selects the System Prompt based on `responseStyle` (Midwife vs. Gadfly).
    3.  Invokes the Vertex AI Model (Gemini) with the full history and context.
    4.  Streams the response back to the user.
-   **Output:** Appends an `AIMessage` to `messages`.

### Edges
`START` -> `examine` -> `aporia` -> `END`

## 5. Persistence
The graph uses `FirestoreSaver` to checkpoint every state transition. This ensures that:
-   Conversations can be resumed seamlessly.
-   Traces are available for debugging (`/traces/[id]`).
-   The "Thinking" process (search results, decisions) is observable.
