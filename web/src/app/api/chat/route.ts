import { NextRequest, NextResponse } from "next/server";
import { app } from "@/agent/graph";
import { db } from "@/lib/firebase/server";
import { generateConversationTitle } from "@/lib/ai/titling";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log("--- CHAT API REQUEST RECEIVED ---");

    try {
        // --- 1. Authentication ---
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // In a real app, verify the Firebase ID token here
        // For now, we trust the client or use a placeholder
        const userId = "test-user-123"; 

        // --- 2. Parse Request ---
        const requestBody = await req.json() as Record<string, unknown>;
        const messages = (requestBody.messages as any[]) || [];
        const threadId = requestBody.threadId as string;
        const configurable = (requestBody.configurable as Record<string, unknown>) || {};

        if (!threadId) {
            return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
        }

        console.log(`[API] Processing thread ${threadId} for user ${userId}`);

        // --- 3. Titling (Background) ---
        // If this is the first message (1 user message in history + 1 new message = 2 total usually, 
        // or just check if title exists)
        const threadRef = db.collection("threads").doc(threadId);
        const threadDoc = await threadRef.get();
        
        if (!threadDoc.exists || !threadDoc.data()?.title) {
            const firstHumanMsg = messages.find(m => m.role === 'user')?.content;
            if (firstHumanMsg) {
                console.log("[API] Generating title for new thread...");
                generateConversationTitle(firstHumanMsg).then(title => {
                    threadRef.set({ 
                        title, 
                        userId,
                        updated_at: new Date() 
                    }, { merge: true });
                }).catch(e => console.error("Titling error:", e));
            }
        }

        // --- 4. Stream from LangGraph Agent ---
        const loader = new ReadableStream({
            async start(controller) {
                try {
                    // Map messages to LangChain format
                    const langchainMessages: BaseMessage[] = messages.map(m => {
                        if (m.role === 'user') return new HumanMessage(m.content);
                        if (m.role === 'assistant') return new AIMessage(m.content);
                        if (m.role === 'system') return new SystemMessage(m.content);
                        return new HumanMessage(m.content);
                    });

                    const eventStream = app.streamEvents(
                        { messages: langchainMessages },
                        {
                            version: "v2",
                            configurable: {
                                thread_id: threadId,
                                ...configurable
                            }
                        }
                    );

                    for await (const event of eventStream) {
                        const eventType = event.event;
                        const nodeName = event.metadata?.langgraph_node;

                        // Only stream back specific events to the client
                        if (eventType === "on_chat_model_stream" || eventType === "on_chat_model_end") {
                            const content = event.data?.chunk?.content || event.data?.output?.content;
                            if (content) {
                                controller.enqueue(`data: ${JSON.stringify({ type: 'text', content, node: nodeName })}\n\n`);
                            }
                        } else if (eventType === "on_chain_start" && event.name === "analyst") {
                            controller.enqueue(`data: ${JSON.stringify({ type: 'status', content: 'deliberating' })}\n\n`);
                        }
                    }
                    controller.close();
                } catch (e: unknown) {
                    console.error("[Stream Error]", e);
                    const errorMsg = (e as Error).message || "Internal Streaming Error";
                    controller.enqueue(`data: ${JSON.stringify({ type: 'error', content: errorMsg })}\n\n`);
                    controller.close();
                }
            }
        });

        return new Response(loader, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (e: unknown) {
        console.error("[API Error]", e);
        return NextResponse.json({ error: (e as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
