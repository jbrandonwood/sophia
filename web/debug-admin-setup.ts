import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Administrative setup script for debugging and initializing the conversation database.
 */
async function setup() {
    console.log("Starting Admin Setup...");
    
    if (getApps().length === 0) {
        initializeApp({
            credential: applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
    }

    const db = getFirestore();

    try {
        const testData: Record<string, unknown> = {
            title: "The Initial Inquiry",
            userId: "test-user-123",
            updated_at: new Date(),
            preview: "Is the soul immortal?"
        };

        const docRef = await db.collection("threads").add(testData);
        console.log("SUCCESS: Created thread ", docRef.id);

        // Clean up
        await docRef.delete();
        console.log("CLEANUP: Deleted test thread.");

    } catch (e: unknown) {
        console.error("SETUP FAILED");
        const err = e as { message?: string; code?: string };
        console.error(`Error: ${err.message || e}`);
        console.error(`Code: ${err.code || 'UNKNOWN'}`);
    }
}

if (require.main === module) {
    setup();
}
