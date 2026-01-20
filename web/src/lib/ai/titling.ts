import { BaseMessage } from "@langchain/core/messages";
import { ChatGoogleVertexAI } from "@langchain/google-vertexai";

/**
 * Generates a descriptive title for a conversation based on its first message.
 * 
 * @param firstMessage The first human message in the thread
 * @returns A concise, philosophical title (max 4-5 words)
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
    const model = new ChatGoogleVertexAI({
        model: "gemini-1.5-flash",
        temperature: 0.1,
    });

    const prompt = `Based on the following user message, generate a 2-4 word "philosophical" title for the discourse.
Do NOT use quotes. Focus on the core ontological or ethical concept.
Example input: "Why do we feel pain?" -> Example output: The Nature of Suffering

Message: ${firstMessage}`;

    const res = await model.invoke(prompt);
    return res.content.toString().trim();
}

/**
 * Extracts a title from a list of messages if available.
 */
export function extractTitleFromMessages(messages: BaseMessage[]): string | undefined {
    // If we have a lot of messages, we might have stored it in metadata or elsewhere,
    // but typically we'll rely on the initial generation.
    return undefined;
}

/**
 * Formats a message role for display.
 */
export function formatRole(role: string): string {
    return role.toUpperCase();
}

/**
 * Gets a descriptive type name for a message.
 */
export function getMessageType(m: BaseMessage): string {
    return m.getType();
}
