
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph";
import { db } from "../firebase/server";
import { RunnableConfig } from "@langchain/core/runnables";

interface FirestoreCheckpointData {
    checkpoint: string; // JSON serialized
    metadata: string; // JSON serialized
    parent_config?: {
        configurable: {
            thread_id: string;
            checkpoint_id: string;
        }
    };
    created_at: number; // Timestamp for ordering
}

export class FirestoreSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const thread_id = config.configurable?.thread_id;
        const checkpoint_id = config.configurable?.checkpoint_id;

        if (!thread_id) return undefined;

        let docPath = `threads/${thread_id}`;

        if (checkpoint_id) {
            docPath += `/checkpoints/${checkpoint_id}`;
        } else {
            // If no checkpoint_id provided, we need the latest.
            // Option A: Read thread_id doc to get HEAD pointer.
            // Option B: Query checkpoints collection limit 1 desc.
            // Let's go with Option B for resilience, assuming we index `created_at` or `ts`.
            // But for MVP, let's look at the thread doc metadata if we store "HEAD" there.
            const threadDoc = await db.collection("threads").doc(thread_id).get();
            if (!threadDoc.exists) return undefined;
            const threadData = threadDoc.data();
            const latestId = threadData?.latest_checkpoint_id;

            if (!latestId) return undefined;
            docPath += `/checkpoints/${latestId}`;
        }

        const docSnap = await db.doc(docPath).get();

        if (!docSnap.exists) {
            return undefined;
        }

        const data = docSnap.data() as FirestoreCheckpointData;
        if (!data || !data.checkpoint) return undefined;

        // Parse JSON
        const checkpoint = JSON.parse(data.checkpoint) as Checkpoint;
        const metadata = (data.metadata ? JSON.parse(data.metadata) : { source: "update", step: 0, parents: {} }) as CheckpointMetadata;

        return {
            config: {
                ...config,
                configurable: {
                    ...config.configurable,
                    checkpoint_id: checkpoint.id,
                }
            },
            checkpoint,
            metadata,
            parentConfig: data.parent_config
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async *list(config: RunnableConfig, _options?: unknown): AsyncGenerator<CheckpointTuple> {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) return;

        // List all checkpoints for this thread, explicitly specific to current requirements
        const snapshot = await db.collection(`threads/${thread_id}/checkpoints`)
            .orderBy('created_at', 'desc')
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data() as FirestoreCheckpointData;
            const checkpoint = JSON.parse(data.checkpoint) as Checkpoint;
            const metadata = JSON.parse(data.metadata) as CheckpointMetadata;

            yield {
                config: {
                    configurable: {
                        thread_id,
                        checkpoint_id: checkpoint.id,
                    }
                },
                checkpoint,
                metadata,
                parentConfig: data.parent_config
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

        const updateData: Record<string, unknown> = {
            latest_checkpoint_id: checkpoint_id,
            updated_at: Date.now(),
            preview: preview || "No preview"
        };

        // If user_id is passed in configurable, save it to the thread doc
        // This is essential for RLS and filtering threads by user
        if (config.configurable?.user_id) {
            updateData.user_id = config.configurable.user_id;
        }

        await threadRef.set(updateData, { merge: true });

        return {
            configurable: {
                thread_id,
                checkpoint_id: checkpoint.id,
            }
        };
    }
}
