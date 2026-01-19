import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const MODEL_NAME = "gemini-1.5-flash-002"; // Fast, cheap model for metadata

// Fire-and-forget title generation
export async function generateThreadTitle(messages: any[]): Promise<string> {
    try {
        const model = new ChatGoogleGenerativeAI({
            modelName: MODEL_NAME,
            maxOutputTokens: 20,
            temperature: 0.5,
            authOptions: {
                credentials: {
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    private_key: process.env.FIREBASE_PRIVATE_KEY,
                }
            }
        });

        // Convert last few messages to text
        const conversationText = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `
        Summarize the following philosophical dialogue into a short, poetic title (max 6 words). 
        Avoid "Chat with AI" or generic labels. 
        Focus on the philosophical mystery or theme (e.g. "Virtue and Happiness", "The Nature of Good").
        Do not use quotes.

        Dialogue:
        ${conversationText}
        `;

        const response = await model.invoke([
            new HumanMessage(prompt)
        ]);

        const title = typeof response.content === 'string' 
            ? response.content.trim() 
            : "Philosophical Inquiry";
            
        return title.replace(/['"]/g, '');

    } catch (e) {
        console.error("Failed to generate title:", e);
        return "Untitled Inquiry";
    }
}
