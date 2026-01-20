import {
    BaseCheckpointSaver,
    Checkpoint,
    CheckpointMetadata,
    RunnableConfig,
} from "@langchain/core/runnables";
import { db } from "../firebase/server";

interface FirestoreCheckpointData {
    checkpoint: string;
    metadata: string;
    parent_config?: RunnableConfig;
    created_at: number;
}

/**
 * A LangGraph checkpointer that stores state in Google Cloud Firestore.
 * Standardizes storage for Sophia's philosophical discourse traces.
 */
export class FirestoreSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    async getTuple(config: RunnableConfig): Promise<any> {
        const thread_id = config.configurable?.thread_id;
        const checkpoint_id = config.configurable?.checkpoint_id;

        if (!thread_id) return undefined;

        console.log(`[FirestoreSaver] Getting state for thread: ${thread_id}, Checkpoint: ${checkpoint_id || 'LATEST'}`);

        let doc;
        if (checkpoint_id) {
            doc = await db.collection(`threads/${thread_id}/checkpoints`).doc(checkpoint_id).get();
        } else {
            // Get latest
            const snapshot = await db.collection(`threads/${thread_id}/checkpoints`)
                .orderBy("created_at", "desc")
                .limit(1)
                .get();
            doc = snapshot.docs[0];
        }

        if (!doc || !doc.exists) {
            console.log(`[FirestoreSaver] No checkpoint found for thread ${thread_id}`);
            return undefined;
        }

        const data = doc.data() as FirestoreCheckpointData;
        const checkpoint = JSON.parse(data.checkpoint) as Checkpoint;
        const metadata = JSON.parse(data.metadata) as CheckpointMetadata;

        return {
            config: {
                configurable: {
                    thread_id,
                    checkpoint_id: doc.id,
                },
            },
            checkpoint,
            metadata,
            parent_config: data.parent_config,
        };
    }

    async *list(
        config: RunnableConfig,
        before?: RunnableConfig,
        limit?: number
    ): AsyncGenerator<any> {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) return;

        let query = db.collection(`threads/${thread_id}/checkpoints`)
            .orderBy("created_at", "desc");

        if (before?.configurable?.checkpoint_id) {
            const beforeDoc = await db.collection(`threads/${thread_id}/checkpoints`)
                .doc(before.configurable.checkpoint_id)
                .get();
            if (beforeDoc.exists) {
                query = query.startAfter(beforeDoc);
            }
        }

        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        for (const doc of snapshot.docs) {
            const data = doc.data() as FirestoreCheckpointData;
            const checkpoint = JSON.parse(data.checkpoint) as Checkpoint;
            const metadata = JSON.parse(data.metadata) as CheckpointMetadata;

            yield {
                config: {
                    configurable: {
                        thread_id,
                        checkpoint_id: doc.id,
                    },
                },
                checkpoint,
                metadata,
                parent_config: data.parent_config,
            };
        }
    }

    async deleteThread(): Promise<void> {
        // Not implemented for MVP
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async putWrites(_config: RunnableConfig, _writes: unknown[], _taskId: string): Promise<void> {
        // Not implemented for MVP
        return;
    }

    async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
        const thread_id = config.configurable?.thread_id;
        console.log(`[FirestoreSaver] Putting checkpoint for thread: ${thread_id}, ID: ${checkpoint.id}`);
        if (!thread_id) {
            console.error("[FirestoreSaver] Missing thread_id config!");
            throw new Error("Missing thread_id in config");
        }

        const checkpoint_id = checkpoint.id;

        // 1. Save the checkpoint to subcollection
        const checkpointRef = db.collection(`threads/${thread_id}/checkpoints`).doc(checkpoint_id);

        const data: FirestoreCheckpointData = {
            checkpoint: JSON.stringify(checkpoint),
            metadata: JSON.stringify(metadata),
            parent_config: {
                configurable: {
                    thread_id,
                    checkpoint_id: config.configurable?.checkpoint_id || checkpoint.id,
                }
            },
            created_at: Date.now()
        };

        await checkpointRef.set(data);

        // 2. Update the parent thread doc with pointer to HEAD
        // We also want to store some metadata on the thread itself for the list view
        const threadRef = db.collection("threads").doc(thread_id);

        // Extract basic info for the thread list
        // Try to get the last message text if available in standard format
        // This is generic handling; specific handling might be needed if state structure varies
        let preview = "";
        // Inspecting unknown state structure
        if (checkpoint.channel_values?.messages && Array.isArray(checkpoint.channel_values.messages)) {
            // Casting messages
            const msgs = checkpoint.channel_values.messages as Array<Record<string, unknown>>; // Internal LangGraph structure
            if (msgs.length > 0) {
                const last = msgs[msgs.length - 1];
                preview = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
                // Truncate
                if (preview.length > 100) preview = preview.substring(0, 100) + "...";
            }
        }

        await threadRef.set({
            last_checkpoint_id: checkpoint_id,
            updated_at: new Date(),
            preview: preview || undefined
        }, { merge: true });

        return {
            configurable: {
                thread_id,
                checkpoint_id,
            },
        };
    }
}
