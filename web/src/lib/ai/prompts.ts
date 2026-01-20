import { ChatVertexAI } from "@langchain/google-vertexai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const INITIAL_PROMPT_SYSTEM = `
You are the Socratic Spirit of Inquiry.
Your goal is to generate a unique, open-ended, and deeply philosophical opening question for a new dialogue.

**Guidelines:**
1.  **Unique & Varied:** Avoid repetition. Draw inspiration from metaphysics, ethics, epistemology, aesthetics, or political philosophy.
2.  **Open-Ended:** The question must invite deep reflection, not a simple yes/no.
3.  **Concise:** Keep it under 2 sentences.
4.  **Tone:** Authoritative, timeless, inviting, yet slightly enigmatic (like the Oracle at Delphi or Heraclitus).
5.  **Format:** Return ONLY the question text. Do not include quotes or "Here is a prompt:".

**Examples of good prompts:**
- "Does the soul reside in the memory, or does the memory reside in the soul?"
- "If you could remove one sorrow from your past, would you still be you?"
- "Is justice a law of the universe, or a contract among men?"
- "What is the sound of a thought before it is spoken?"
`;

const FALLBACK_PROMPTS = [
    "The unexamined life is not worth living. Do you agree?",
    "Does the soul reside in the memory, or does the memory reside in the soul?",
    "If you could remove one sorrow from your past, would you still be you?",
    "Is justice a law of the universe, or a contract among men?",
    "What is the sound of a thought before it is spoken?",
    "Can a machine truly know the meaning of silence, or effectively simulate it?",
    "Is the present moment a bridge between the past and future, or an island unto itself?",
    "Do we discover truth, or do we create it?",
    "Is it better to suffer injustice than to commit it?",
    "Does wisdom bring happiness, or merely a deeper understanding of sorrow?",
    "Are we the architects of our destiny, or merely passengers on a predetermined course?",
    "What is the most courageous act: to speak the truth, or to hear it?",
    "If perception is reality, whose reality is true?",
    "Is there a difference between living and merely existing?",
    "Can virtue be taught, or is it an innate quality of the soul?",
    "Is the mind a vessel to be filled, or a fire to be kindled?",
    "Does history repeat itself because time is a circle, or because human nature is unchanging?",
    "Is freedom the absence of constraints, or the ability to choose one's burdens?"
];

export async function generateInitialPrompt(): Promise<string> {
    try {
        const model = new ChatVertexAI({
            model: "gemini-3-flash-preview",
            temperature: 0.9,
            maxOutputTokens: 100,
            location: 'global'
        });

        const response = await model.invoke([
            new SystemMessage(INITIAL_PROMPT_SYSTEM),
            new HumanMessage("Speak, Spirit. Begin the inquiry.")
        ]);

        const prompt = typeof response.content === 'string' ? response.content.trim() : "";

        if (!prompt) throw new Error("Empty response from AI");

        return prompt.replace(/^"|"$/g, '').trim();

    } catch (error) {
        console.warn("Error generating initial prompt (falling back to curated list):", error);
        // Return a random fallback prompt
        return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    }
}
