import { NextResponse } from "next/server";
import { generateInitialPrompt } from "@/lib/ai/prompts";

export const dynamic = 'force-dynamic';

/**
 * Endpoint to generate a unique, open-ended initial prompt for a new discourse.
 */
export async function GET() {
    try {
        const prompt = await generateInitialPrompt();
        return NextResponse.json({ prompt });
    } catch (error: unknown) {
        console.error("Failed to generate initial prompt:", error);
        // Fallback to a core Socratic inquiry if AI fails
        return NextResponse.json({ 
            prompt: "Consider the nature of justice: is it the interest of the stronger, or something more fundamental?" 
        });
    }
}
