import * as admin from 'firebase-admin';

/**
 * Ensures that the Firebase Admin SDK is initialized exactly once.
 * This is called lazily to avoid build-time errors when secrets are missing.
 */
function ensureInitialized() {
    if (admin.apps.length > 0) return;

    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // During build time in CI, we may not have these variables.
    // However, in Cloud Run, we should rely on Application Default Credentials (ADC)
    // if the explicit private key/email are not available.

    if (admin.apps.length > 0) return;

    try {
        if (privateKey && clientEmail) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
                projectId
            });
            console.log("Firebase Admin Initialized with explicit credentials for project:", projectId);
        } else {
            // Fallback to ADC (Application Default Credentials)
            // This works automatically on Cloud Run if the service account has permissions.
            // We still need a projectId, which should be available from build args.
            if (projectId) {
                admin.initializeApp({
                    projectId,
                    credential: admin.credential.applicationDefault()
                });
                console.log("Firebase Admin Initialized with ADC for project:", projectId);
            } else {
                console.warn("Firebase Admin: Project ID is missing. Initialization skipped.");
            }
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

/**
 * Lazy-loaded Firestore instance.
 * Using a Proxy ensures that initializeApp is called only when the db is actually accessed.
 */
export const db = new Proxy({} as admin.firestore.Firestore, {
    get(_, prop) {
        ensureInitialized();
        const firestore = admin.firestore();
        const value = Reflect.get(firestore, prop);
        return typeof value === 'function' ? value.bind(firestore) : value;
    }
});

/**
 * Lazy-loaded Auth instance.
 */
export const auth = new Proxy({} as admin.auth.Auth, {
    get(_, prop) {
        ensureInitialized();
        const authService = admin.auth();
        const value = Reflect.get(authService, prop);
        return typeof value === 'function' ? value.bind(authService) : value;
    }
});
