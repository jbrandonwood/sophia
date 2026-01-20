"use server";

import { db } from "../lib/firebase/server";
import { ThreadMetadata } from "../lib/types";

/**
 * Fetches all threads belonging to a specific user, ordered by most recent update.
 */
export async function getUserThreads(userId: string): Promise<ThreadMetadata[]> {
    try {
        const snapshot = await db.collection("threads")
            .where("user_id", "==", userId)
            .orderBy("updated_at", "desc")
            .get();

        const threads: ThreadMetadata[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            threads.push({
                id: doc.id,
                user_id: data.user_id,
                title: data.title || "New Inquiry",
                preview: data.preview || "",
                updated_at: data.updated_at,
                latest_checkpoint_id: data.latest_checkpoint_id
            });
        });

        return threads;
    } catch (error) {
        console.error("Error fetching user threads:", error);
        return [];
    }
}

/**
 * Deletes a thread and its subcollection checkpoints.
 */
export async function deleteThread(threadId: string, userId: string): Promise<boolean> {
    try {
        const threadRef = db.collection("threads").doc(threadId);
        const doc = await threadRef.get();

        if (!doc.exists) return false;
        const data = doc.data();

        if (data?.user_id !== userId) {
            throw new Error("Unauthorized");
        }

        await threadRef.delete();

        return true;
    } catch (error) {
        console.error("Error deleting thread:", error);
        return false;
    }
}

export async function getThreadMessages(threadId: string) {
    try {
        const threadRef = db.collection("threads").doc(threadId);
        const threadDoc = await threadRef.get();

        if (!threadDoc.exists) return [];

        const latestId = threadDoc.data()?.latest_checkpoint_id;
        if (!latestId) return [];

        const checkpointDoc = await threadRef.collection("checkpoints").doc(latestId).get();
        if (!checkpointDoc.exists) return [];

        const data = checkpointDoc.data();
        if (!data?.checkpoint) return [];

        const checkpoint = JSON.parse(data.checkpoint);
        // messages in LangGraph state are in channel_values
        const messages = checkpoint.channel_values?.messages || [];

        return messages.map((m: { id?: string | string[]; type?: string; content?: string; kwargs?: { id?: string; content?: string } }) => {
            let role = 'user';
            const typeStr = Array.isArray(m.id) ? m.id.join('.') : (m.type || '');

            if (typeStr.includes('SystemMessage') || m.type === 'system') role = 'system';
            else if (typeStr.includes('AIMessage') || m.type === 'ai') role = 'assistant';
            else if (typeStr.includes('HumanMessage') || m.type === 'human') role = 'user';

            const content = m.content || m.kwargs?.content || "";
            const id = (typeof m.id === 'string' ? m.id : m.kwargs?.id) || crypto.randomUUID();

            return {
                id: id,
                role: role,
                content: content
            };
        });

    } catch (error) {
        console.error("Error fetching thread messages:", error);
        return [];
    }
}
