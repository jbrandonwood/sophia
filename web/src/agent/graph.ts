/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateGraph } from "@langchain/langgraph";
import { AgentState, AgentStateAnnotation } from "./state";
import { AnalystNode } from "./nodes/analyst";
import { InterlocutorNode } from "./nodes/interlocutor";
import { SynthesizerNode } from "./nodes/synthesizer";
import { CriticNode } from "./nodes/critic";
import { FirestoreSaver } from "../lib/langgraph/firestore-saver";

// We use an explicit 'any' for the compiled app to satisfy complex Generic constraints in LangChain
let compiledApp: any = null;

export async function getApp() {
    if (compiledApp) return compiledApp;

    const saver = new FirestoreSaver();

    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode("analyst", AnalystNode)
        .addNode("interlocutor", InterlocutorNode)
        .addNode("synthesizer", SynthesizerNode)
        .addNode("critic", CriticNode)
        .addEdge("__start__", "analyst")
        .addEdge("analyst", "interlocutor")
        .addEdge("interlocutor", "__end__");

    compiledApp = workflow.compile({
        checkpointer: saver
    });

    return compiledApp;
}
