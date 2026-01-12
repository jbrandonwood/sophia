
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph";
import { db } from "../firebase/server";
import { RunnableConfig } from "@langchain/core/runnables";

interface FirestoreCheckpoint {
    checkpoint: string; // JSON serialized
    metadata: string; // JSON serialized
    parent_config?: {
        configurable: {
            thread_id: string;
            checkpoint_id: string;
        }
    }
}

export class FirestoreSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const thread_id = config.configurable?.thread_id;
        const checkpoint_id = config.configurable?.checkpoint_id;

        if (!thread_id) return undefined;

        if (checkpoint_id) {
            // Fetch specific checkpoint (not implemented for MVP, returning latest)
            // In a real implementation we might store sub-collections `checkpoints`
            // For MVP, we presume strict latest-only or monolithic state?
            // Spec says: `threads/{thread_id}` stores state.
            // It implies overwriting? LangGraph usually needs history.
            // Let's implement getting the HEAD.
        }

        const docRef = db.collection("threads").doc(thread_id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return undefined;
        }

        const data = docSnap.data() as FirestoreCheckpoint;
        if (!data || !data.checkpoint) return undefined;

        // Parse JSON
        // Note: In JS SDK, serialization is often handled by the caller or saver. 
        // We will assume standard JSON.parse/stringify for simple states.
        // For complex objects, we might need a serializer.

        // Checkpoint is expected to be an object.
        const checkpoint = JSON.parse(data.checkpoint) as Checkpoint;
        const metadata = (data.metadata ? JSON.parse(data.metadata) : { source: "update", step: 0, parents: {} }) as CheckpointMetadata;

        // We need to return CheckpointTuple
        return {
            config,
            checkpoint,
            metadata,
            parentConfig: data.parent_config
        };
    }

    async deleteThread(threadId: string): Promise<void> {
        // Not implemented for MVP
        return;
    }

    async *list(config: RunnableConfig, options?: any): AsyncGenerator<CheckpointTuple> {
        // Not implemented for MVP
        // Yielding nothing matches the generator type
        return;
    }

    async putWrites(config: RunnableConfig, writes: any[], taskId: string): Promise<void> {
        // Not implemented for MVP
        return;
    }

    async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, newVersions: Record<string, any>): Promise<RunnableConfig> {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) {
            throw new Error("Missing thread_id in config");
        }

        const docRef = db.collection("threads").doc(thread_id);

        const data: FirestoreCheckpoint = {
            checkpoint: JSON.stringify(checkpoint),
            metadata: JSON.stringify(metadata),
            parent_config: {
                configurable: {
                    thread_id,
                    checkpoint_id: config.configurable?.checkpoint_id || checkpoint.id,
                }
            }
        };

        await docRef.set(data, { merge: true });

        return {
            configurable: {
                thread_id,
                checkpoint_id: checkpoint.id,
            }
        };
    }
}
