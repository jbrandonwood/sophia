import { NextRequest, NextResponse } from 'next/server';
import { app } from '@/agent/graph';
import { HumanMessage } from '@langchain/core/messages';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;

        // Safety check
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        const lastMessageContent = messages[messages.length - 1].content;

        // Create input state. 
        // We cast to 'any' to avoid strict input matching issues that sometimes occur 
        // with LangGraph's compiled Runnable type in strict TS environments.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input: any = {
            messages: [new HumanMessage(lastMessageContent)],
            vertexSearchCount: 0,
        };

        const result = await app.invoke(input);

        // Result message extraction
        // The result state contains all messages.
        // Ideally we want the last one, which should be the AI response.
        const resultMessages = result.messages;
        const aiMessage = resultMessages[resultMessages.length - 1];

        let content = "";
        if (typeof aiMessage.content === 'string') {
            content = aiMessage.content;
        } else {
            content = JSON.stringify(aiMessage.content);
        }

        return NextResponse.json({
            role: 'assistant',
            content: content,
            id: crypto.randomUUID()
        });

    } catch (e: any) {
        console.error("Agent Error:", e);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({ error: (e as any).message || "Internal Server Error" }, { status: 500 });
    }
}
