import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple, SerializerProtocol } from "@langchain/langgraph-checkpoint";
import { Firestore } from "firebase-admin/firestore";

/**
 * A LangGraph CheckpointSaver that stores state in Google Cloud Firestore.
 * 
 * Schema:
 * - Collection: `threads` (docs)
 *   - Subcollection: `checkpoints` (docs) -> stores the actual state
 *   - Subcollection: `writes` (docs) -> stores side effects/writes (not strictly needed for basic chatbot but good for full compliance)
 */
export class FirestoreSaver extends BaseCheckpointSaver {
    private db: Firestore;

    constructor(db: Firestore, serde?: SerializerProtocol) {
        super(serde);
        this.db = db;
    }

    async getTuple(config: { configurable: { thread_id: string; checkpoint_id?: string } }): Promise<CheckpointTuple | undefined> {
        const threadId = config.configurable.thread_id;
        const checkpointId = config.configurable.checkpoint_id;

        if (!threadId) return undefined;

        try {
            if (checkpointId) {
                // Fetch specific checkpoint
                const docRef = this.db.collection("threads").doc(threadId).collection("checkpoints").doc(checkpointId);
                const doc = await docRef.get();
                if (!doc.exists) return undefined;
                
                const data = doc.data();
                if (!data) return undefined;

                return {
                    config,
                    checkpoint: (await this.serde.loads(data.checkpoint)) as Checkpoint,
                    metadata: (await this.serde.loads(data.metadata)) as CheckpointMetadata,
                    parentConfig: data.parent_checkpoint_id ? {
                        configurable: {
                            thread_id: threadId,
                            checkpoint_id: data.parent_checkpoint_id
                        }
                    } : undefined
                };
            } else {
                // Fetch latest
                // We rely on storing a pointer in the parent thread doc or query ordered by id
                // LangGraph standard pattern: checkpoints are keyed by ID which is checkpointer specific.
                // We will assume lexicographical sort or timestamp. 
                // Let's grab the 'latest_checkpoint_id' from the thread metadata if we maintain it, 
                // OR query the subcollection order by write time.

                // Strategy 1: Read 'threads/{threadId}' to get 'latest_checkpoint_id'
                const threadDoc = await this.db.collection("threads").doc(threadId).get();
                if (!threadDoc.exists) return undefined;
                
                const latestId = threadDoc.data()?.latest_checkpoint_id;
                if (!latestId) return undefined;

                return this.getTuple({ configurable: { thread_id: threadId, checkpoint_id: latestId } });
            }
        } catch (e) {
            console.error("Error getting checkpoint tuple", e);
            return undefined;
        }
    }

    async *list(config: { configurable: { thread_id: string } }, startIsBefore?: string, limit?: number): AsyncGenerator<CheckpointTuple> {
        const threadId = config.configurable.thread_id;
        // Not critical for basic playback, implementing basic version
        const query = this.db.collection("threads").doc(threadId).collection("checkpoints").limit(limit || 10);
        // Ordering would go here...
        
        const snapshot = await query.get();
        for (const doc of snapshot.docs) {
             const data = doc.data();
             yield {
                config: { configurable: { thread_id: threadId, checkpoint_id: doc.id } },
                checkpoint: (await this.serde.loads(data.checkpoint)) as Checkpoint,
                metadata: (await this.serde.loads(data.metadata)) as CheckpointMetadata,
             } as CheckpointTuple;
        }
    }

    async put(config: { configurable: { thread_id: string; checkpoint_id?: string } }, checkpoint: Checkpoint, metadata: CheckpointMetadata, newVersions: Record<string, string | number>): Promise<{ configurable: { thread_id: string; checkpoint_id: string } }> {
        const threadId = config.configurable.thread_id;
        const checkpointId = checkpoint.id; // LangGraph generates this ID

        // Serialize
        const serializedCheckpoint = await this.serde.dumps(checkpoint);
        const serializedMetadata = await this.serde.dumps(metadata);

        const batch = this.db.batch();

        // 1. Write Checkpoint
        const checkpointRef = this.db.collection("threads").doc(threadId).collection("checkpoints").doc(checkpointId);
        batch.set(checkpointRef, {
            checkpoint: serializedCheckpoint,
            metadata: serializedMetadata,
            parent_checkpoint_id: config.configurable.checkpoint_id || null,
            created_at: Date.now()
        });

        // 2. Update Thread Pointer (Head)
        // Also store user_id if passed in metadata/config for easy querying later?
        // LangGraph config is opaque. We can try to extract 'user_id' if we passed it in 'configurable'.
        const threadRef = this.db.collection("threads").doc(threadId);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatePayload: any = {
            latest_checkpoint_id: checkpointId,
            updated_at: Date.now()
        };

        // If we passed user_id in the configurable, let's look for it (Standard pattern is to pass it in configurable)
        // Check `config.configurable` for user_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (config.configurable as any).user_id;

        if (userId) {
            updatePayload.user_id = userId;
        }
        
        // We use set(..., {merge: true}) so we don't overwrite if it exists, but create if it fails
        batch.set(threadRef, updatePayload, { merge: true });

        await batch.commit();

        return {
             configurable: {
                 thread_id: threadId,
                 checkpoint_id: checkpointId
             }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async putWrites(config: { configurable: { thread_id: string; checkpoint_id?: string } }, writes: any[], taskId: string): Promise<void> {
        // Not implemented for this MVP
        // Writes are side effects.
        return;
    }
}
