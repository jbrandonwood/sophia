import { NextResponse } from 'next/server';
import { generateInitialPrompt } from '@/lib/ai/prompts';

export async function GET() {
    try {
        const prompt = await generateInitialPrompt();
        return NextResponse.json({ prompt });
    } catch (error: unknown) {
        console.error("Initial prompt API error:", error);
        return NextResponse.json({ prompt: "The unexamined life is not worth living. Do you agree?" });
    }
}
