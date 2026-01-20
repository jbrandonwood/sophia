---
description: Update the agent system documentation when the core logic changes
---

# Update Agent System Documentation

Follow this workflow whenever changes are made to the agent's core logic, state definition, or graph structure in `web/src/agent`.

## 1. Analyze Changes
Read the key agent files to understand the latest architecture.
- `web/src/agent/graph.ts` (Core logic and state)
- `web/src/agent/vertex.ts` (Search integration)
- `web/src/agent/prompts.ts` (Persona definitions)

## 2. Review Existing Documentation
Read the current documentation to see what is outdated.
- `context/agent-system.md`

## 3. Update Documentation
Update `context/agent-system.md` to reflect the new reality. Pay attention to:
- **State Schema:** Have new fields been added to `AgentState`?
- **Nodes:** Have new nodes been added or renamed?
- **Routing:** Has the logic for switching between Midwife and Gadfly changed?
- **Models:** Has the underlying model (e.g., Gemini version) been updated?

## 4. Verification
Ensure the documentation accurately describes the code.
- Does the "Graph Workflow" section match the `addEdge` calls in `graph.ts`?
- Are the cited System Prompts consistent with the code?
