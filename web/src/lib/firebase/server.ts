
import { initializeApp, getApps, getApp, cert, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
    if (getApps().length) {
        return getApp();
    }

    // If we have explicit credentials (e.g. from secrets)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        const serviceAccount: ServiceAccount = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        };
        return initializeApp({
            credential: cert(serviceAccount),
        });
    }

    // Otherwise, fallback to Application Default Credentials (ADC)
    // This works automatically on Cloud Run if the service account has permissions.
    return initializeApp();
}

const app = getFirebaseAdminApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
