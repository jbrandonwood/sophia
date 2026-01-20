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
        const allLines = messages
            .filter(m => m.content && typeof m.content === 'string')
            .map(m => {
                const role = m.getType();
                return `${role}: ${m.content}`;
            });

        // Use first message + last 3 turns
        const sample = allLines.length > 4
            ? [allLines[0], ...allLines.slice(-3)]
            : allLines;

        const dialogue = sample.join("\n");

        if (dialogue.length < 10) return "New Inquiry";

        const model = new ChatVertexAI({
            model: "gemini-3-flash-preview",
            temperature: 0.3, // Lower temp for consistent titles
            maxOutputTokens: 20,
            location: 'global'
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
