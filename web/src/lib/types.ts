export interface ThreadMetadata {
    /**
     * Unique identifier for the thread (UUID).
     */
    id: string;

    /**
     * The Firebase Auth user ID provided by the token.
     */
    user_id: string;

    /**
     * A short, generated title for the conversation.
     */
    title: string;

    /**
     * A preview of the last message in the thread.
     */
    preview: string;

    /**
     * Timestamp of the last update (ms since epoch).
     */
    updated_at: number;

    /**
     * The ID of the latest checkpoint in LangGraph.
     */
    latest_checkpoint_id: string;
}
