import { NextRequest, NextResponse } from 'next/server';
import { getApp } from '@/agent/graph';
import { HumanMessage } from '@langchain/core/messages';
import { auth } from '@/lib/firebase/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const runId = crypto.randomUUID();
    console.log(`[API/Chat] [${runId}] Starting request processing`);

    console.log(`[API/Chat] [${runId}] Headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn(`[API/Chat] [${runId}] Missing or invalid Authorization header: ${authHeader}`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId: string;

    try {
        console.log(`[API/Chat] [${runId}] Verifying token for Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Unknown'}`);
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log(`[API/Chat] [${runId}] Token verified. UserID: ${userId}`);
    } catch (authError: any) {
        console.error(`[API/Chat] [${runId}] Auth verification failed:`, authError);
        console.error(`[API/Chat] [${runId}] Error Code: ${authError.code}, Message: ${authError.message}`);
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const app = await getApp();

    try {
        const body = await req.json();
        const { messages, threadId } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.warn(`[API/Chat] [${runId}] Invalid messages payload`);
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        const lastMessageContent = messages[messages.length - 1].content;
        const currentThreadId = threadId || crypto.randomUUID();
        console.log(`[API/Chat] [${runId}] ThreadID: ${currentThreadId} | UserID: ${userId}`);

        // Background Task: Generate Title (Fire-and-forget-ish)
        // We only generate if it's a relatively new thread to save costs/latency
        if (messages.length > 2 && messages.length < 10) {
            (async () => {
                try {
                    const { generateThreadTitle } = await import('@/lib/ai/titling');
                    const title = await generateThreadTitle(messages);
                    const { db } = await import('@/lib/firebase/server');
                    await db.collection('threads').doc(currentThreadId).set({ title }, { merge: true });
                } catch (err) {
                    console.error("Title generation background error:", err);
                }
            })();
        }

        // Ensure thread exists with user_id immediately so it shows up in the sidebar
        // The checkpointer will update it later, but we need the user_id link now-ish.
        (async () => {
            try {
                const { db } = await import('@/lib/firebase/server');
                await db.collection('threads').doc(currentThreadId).set({
                    user_id: userId,
                    updated_at: Date.now()
                }, { merge: true });
            } catch (e) {
                console.error("Error setting thread user_id:", e);
            }
        })();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input: any = {
            messages: [new HumanMessage(lastMessageContent)],
        };

        const stream = await app.streamEvents(input, {
            configurable: {
                thread_id: currentThreadId,
                user_id: userId
            },
            version: "v2"
        });

        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    let hasSentContent = false;
                    for await (const event of stream) {
                        // Text Delta (0)
                        if (event.event === "on_chat_model_stream") {
                            const content = event.data?.chunk?.content;
                            console.log(`[API/Chat] [${runId}] Model Stream Content:`, content ? content.substring(0, 20) + "..." : "EMPTY");
                            if (content && typeof content === 'string') {
                                // Protocol: 0:"content"\n
                                controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                                hasSentContent = true;
                            }
                        } else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                            console.log(`[API/Chat] [${runId}] Graph Execution Completed.`);
                            if (!hasSentContent) {
                                // Fallback: Send the final message content if nothing was streamed
                                // The output of LangGraph is the state
                                const outputMessages = event.data?.output?.messages;
                                if (Array.isArray(outputMessages) && outputMessages.length > 0) {
                                    const lastMsg = outputMessages[outputMessages.length - 1];
                                    if (lastMsg.content && typeof lastMsg.content === 'string') {
                                        console.log(`[API/Chat] [${runId}] Fallback: Sending full content from final state.`);
                                        controller.enqueue(encoder.encode(`0:${JSON.stringify(lastMsg.content)}\n`));
                                    }
                                }
                            }
                        } else {
                            console.log(`[API/Chat] [${runId}] Event: ${event.event} | Name: ${event.name} | Tags: ${event.tags}`);
                        }
                    }
                } catch (e) {
                    console.error("Stream Error", e);
                } finally {
                    controller.close();
                }
            }
        });

        return new NextResponse(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'x-sophia-thread-id': currentThreadId
            }
        });

    } catch (e: any) {
        console.error(`[API/Chat] [${runId}] Agent Error:`, e);
        return NextResponse.json({ error: (e as any).message || "Internal Server Error" }, { status: 500 });
    }
}
