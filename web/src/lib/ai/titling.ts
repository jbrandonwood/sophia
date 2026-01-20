import { ChatVertexAI } from "@langchain/google-vertexai";
import { HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

const TITLE_SYSTEM_PROMPT = `
You are the Scribe of the Digital Stoa.
Your task is to read a philosophical dialogue and generate a short, poetic, and meaningful title for it.

**Rules:**
1. Maximum 6 words.
2. Avoid generic phrases like "Chat with AI" or "Conversation about...".
3. Use a philosophical tone (e.g., "The Nature of Virtue", "On the fragility of time").
4. If the conversation is just a greeting, return "New Inquiry".
5. Do not use quotes in the output.
`;

export async function generateThreadTitle(messages: BaseMessage[]): Promise<string> {
    try {
        if (!messages || messages.length === 0) return "New Inquiry";

        // Filter for meaningful content (skip system prompts, empty messages)
        const dialogue = messages
            .filter(m => m.content && typeof m.content === 'string')
            .map(m => {
                const role = (m as any).role || m.getType();
                return `${role}: ${m.content}`;
            })
            .slice(-4) // Only look at the last few turns to capture the current theme, or maybe all? 
            // Better to look at the first few + last few? For a title, usually the beginning determines the topic.
            // Let's take the first 2 user messages and the last 2 messages.
            .join("\n");

        if (dialogue.length < 10) return "New Inquiry";

        const model = new ChatVertexAI({
            model: "gemini-1.5-pro-002", // Fallback to Pro if Flash is unavailable
            temperature: 0.3, // Lower temp for consistent titles
            maxOutputTokens: 20,
            location: 'us-central1'
        });

        const input = [
            new SystemMessage(TITLE_SYSTEM_PROMPT),
            new HumanMessage(`Dialogue:\n${dialogue}\n\nTitle:`)
        ];

        const response = await model.invoke(input);
        const title = typeof response.content === 'string' ? response.content.trim() : "Philosophical Inquiry";

        // Cleanup
        return title.replace(/^"|"$/g, '').trim();

    } catch (error) {
        console.error("Error generating title:", error);
        return "Philosophical Inquiry";
    }
}
