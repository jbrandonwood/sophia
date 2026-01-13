import { NextRequest, NextResponse } from 'next/server';
import { app } from '@/agent/graph';
import { HumanMessage } from '@langchain/core/messages';

export async function POST(req: NextRequest) {
    const runId = crypto.randomUUID();
    console.log(`[API/Chat] [${runId}] Starting request processing`);

    try {
        const body = await req.json();
        const { messages, threadId } = body;
        console.log(`[API/Chat] [${runId}] Received body. Messages: ${messages?.length}, Thread: ${threadId}`);

        // Safety check
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.warn(`[API/Chat] [${runId}] Invalid messages payload`);
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        const lastMessageContent = messages[messages.length - 1].content;
        console.log(`[API/Chat] [${runId}] Last message content: ${lastMessageContent.substring(0, 50)}...`);

        // Use provided threadId or generate a new one
        const currentThreadId = threadId || crypto.randomUUID();
        console.log(`[API/Chat] [${runId}] Using ThreadID: ${currentThreadId}`);

        // Create input state. 
        // We cast to 'any' to avoid strict input matching issues that sometimes occur 
        // with LangGraph's compiled Runnable type in strict TS environments.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input: any = {
            messages: [new HumanMessage(lastMessageContent)],
            vertexSearchCount: 0,
        };

        console.log(`[API/Chat] [${runId}] Invoking LangGraph agent...`);
        const result = await app.invoke(input, {
            configurable: {
                thread_id: currentThreadId
            }
        });
        console.log(`[API/Chat] [${runId}] Agent invoke complete.`);

        // Result message extraction
        // The result state contains all messages.
        // Ideally we want the last one, which should be the AI response.
        const resultMessages = result.messages;
        const aiMessage = resultMessages[resultMessages.length - 1];
        console.log(`[API/Chat] [${runId}] Result message generated. Role: ${aiMessage?._getType()}`);

        let content = "";
        if (typeof aiMessage.content === 'string') {
            content = aiMessage.content;
        } else {
            content = JSON.stringify(aiMessage.content);
        }

        return NextResponse.json({
            role: 'assistant',
            content: content,
            id: crypto.randomUUID(),
            threadId: currentThreadId
        }, {
            headers: {
                'x-sophia-thread-id': currentThreadId
            }
        });

    } catch (e: any) {
        console.error(`[API/Chat] [${runId}] Agent Error:`, e);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({ error: (e as any).message || "Internal Server Error" }, { status: 500 });
    }
}
