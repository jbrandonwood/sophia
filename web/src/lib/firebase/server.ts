import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!privateKey) {
            console.error("FIREBASE_PRIVATE_KEY is missing in environment variables.");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle newlines in private key if they are escaped
                privateKey: privateKey?.replace(/\\n/g, '\n'),
            }),
        });
        console.log("Firebase Admin Initialized successfully for project:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
