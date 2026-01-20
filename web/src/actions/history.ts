import { db } from "@/lib/firebase/server";
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    Timestamp,
    limit as firestoreLimit
} from "firebase/firestore";

/**
 * Fetches the conversation history for a specific user from Firestore.
 * 
 * @param userId The unique ID of the authenticated user
 * @param limit The maximum number of threads to retrieve (default: 20)
 * @returns An array of thread objects with id, title, and timestamp
 */
export async function getConversationHistoryFromClient(userId: string, limit: number = 20) {
    if (!userId) return [];

    try {
        const threadsRef = collection(db, "threads");
        const q = query(
            threadsRef,
            where("userId", "==", userId),
            orderBy("updated_at", "desc"),
            firestoreLimit(limit)
        );

        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "Untitled Discourse",
                updated_at: data.updated_at instanceof Timestamp 
                    ? data.updated_at.toDate() 
                    : new Date(data.updated_at),
                preview: data.preview || ""
            };
        });
    } catch (e: unknown) {
        console.error("Error fetching conversation history:", e);
        return [];
    }
}
