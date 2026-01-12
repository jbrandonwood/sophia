# Feature Spec: LangGraph Socratic Agent

**Feature:** Socratic Dialectic Agent & UI  
**Status:** Draft  
**Owner:** Brandon Wood  

## 1. Goal Description
Implement the core "Socratic Loop" (Elicit -> Examine -> Aporia) using LangGraph, grounded in the Philosophical Corpus via Vertex AI Search (Gemini 3.0). The frontend will implement the "Digital Stoa" design system (Script Format, no chat bubbles).

## 2. User Stories
*   **As a Logic Builder**, I want the agent to question my premises rather than just answering my questions, so I can refine my thinking.
*   **As an Ethical Practitioner**, I want the agent to cite specific texts (e.g., *Epictetus, Enchiridion*) when challenging my views, so I can study the source.
*   **As a User**, I want a distraction-free reading experience that looks like a dialogue script, not a messaging app.

## 3. Technical Implementation

### 3.1 Architecture Diagram (Data Flow)
```mermaid
graph TD
    User[User Input] --> NextJS[Next.js API Route]
    NextJS --> LangGraph[LangGraph State Machine]
    
    subgraph "Socratic Loop (LangGraph)"
        Elicit[Node: Elicit (Ask)]
        Examine[Node: Examine (Search & Reason)]
        Aporia[Node: Aporia (Challenge)]
        
        Elicit -->|User Responds| Examine
        Examine -->|Found Contradiction| Aporia
        Examine -->|Need Clarification| Elicit
        Aporia -->|User Concedes| Elicit
    end

    Examine -->|Query| VertexAI[Vertex AI Search]
    VertexAI -->|Chunks + Citations| Examine
```

### 3.2 LangGraph Agent (`/web/src/agent/`)
*   **State Schema:**
    ```typescript
    interface AgentState {
      messages: BaseMessage[];
      currentPhase: 'elicit' | 'examine' | 'aporia';
      ragCitations: Citation[];
      vertexSearchCount: number; // Cost control
    }
    ```
*   **Nodes:**
    1.  `elicit`: Generates probing questions.
    2.  `examine`: Uses tool calling to query Vertex AI.
        *   **Constraint:** Max 10 search calls per turn.
        *   **Tool:** `search_philosophical_corpus(query: string)`.
    3.  `aporia`: Synthesizes contradictions found in the corpus vs. user input.

### 3.3 Vertex AI Integration (`/web/src/lib/vertex.ts`)
*   **Client:** Instantiate Vertex AI Search client.
*   **Model:** Gemini 3.0 (via Vertex SDK).
*   **Cost Control:** logic to hard-stop searching after N attempts.

### 3.4 Frontend UI (`/web/src/components/chat/`)
*   **Component:** `DialogueStream.tsx`
    *   **Design:** Script format.
        *   **User:** "User: [Text]"
        *   **Sophia:** "Sophia: [Text]"
    *   **Typography:** `max-w-prose`, Serif for Sophia, Sans for User.
    *   **Citations:** Render `[Source]` as `HoverCard` triggers.

## 4. UI/UX Design
*   **Layout:**
    *   Central column, max 65ch width.
    *   Clean, off-white background (#F9F8F4).
    *   No bubbles, no avatars.
*   **Interaction:**
    *   Input field at bottom, minimal border.
    *   "Thinking..." state is subtle (pulsing text, no spinners).

## 5. Verification Plan
### 5.1 Automated Tests
*   **Unit:** Test LangGraph state transitions (ensure loop doesn't get stuck).
*   **Integration:** Mock Vertex AI response and verify `search_philosophical_corpus` limits.

### 5.2 Manual Verification
*   **Dialogue Flow:** Verify the agent doesn't just "answer" but asks a follow-up.
*   **Citations:** Hover over a citation and verify the text appears.
*   **Cost Check:** Run a complex query and verify < 10 search calls in logs.
