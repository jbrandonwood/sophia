import { NextResponse } from 'next/server';
import { generateInitialPrompt } from '@/lib/ai/prompts';

export const maxDuration = 10;
export const dynamic = 'force-dynamic'; // Always fetch a new one

export async function GET() {
    try {
        const prompt = await generateInitialPrompt();
        return NextResponse.json({ prompt });
    } catch (error: any) {
        console.error("API Error generating prompt:", error);
        return NextResponse.json(
            { prompt: "The unexamined life is not worth living. Do you agree?" },
            { status: 200 } // Graceful fallback
        );
    }
}
