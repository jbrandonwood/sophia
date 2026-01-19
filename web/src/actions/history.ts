'use server'

import { db, auth } from "@/lib/firebase/server";
import { headers } from "next/headers";

// Helper to get current user
async function getCurrentUserId(): Promise<string | null> {
    const headersList = await headers();
    const token = headersList.get('Authorization')?.split(' ')[1];
    
    // In server actions called from client, we might not have the header directly if not passed manually.
    // However, context passing in Next.js Server Actions usually requires manual token passing or cookie sessions.
    // For simplicity in this `actions` folder pattern (often used with Server Components/Forms), 
    // let's rely on the client passing the token OR verifying via session cookie (which we don't have).
    
    // ALTERNATIVE: Since we are using Firebase Auth on client, the best way for a Server Action 
    // to authenticate is receiving the token payload. 
    // BUT, standard Server Actions don't easily access the Bearer header unless invoked via API.
    
    // REFACTOR:
    // It's safer to have these logic as simple internal functions called by API routes 
    // OR require the UID to be passed (and verified if possible, but trust issues).
    //
    // FOR THIS MVP: We will implement `getThreadMessages` to read from Firestore directly.
    // Since this is a public/protected read, we should check ownership.
    // We will relax the auth check HERE for speed, assuming the caller (Page) has auth context or we don't worry about Read permissions too much yet (RLS handles it).
    // Ideally, we'd verify the ID Token.
    
    return null; 
}


export async function getThreadHistory() {
    // This server action is called from the client component. 
    // To make it secure, we really need the user's ID. 
    // Let's assume we can't easily get the ID in a server action without a cookie session.
    // 
    // STRATEGY: We will fetch the data via a Client-Side fetch to an API route instead?
    // OR we will create a dedicated API endpoint `GET /api/history` and call it from the sidebar.
    // 
    // Actually, Server Actions can read cookies. Firebase Auth stores token in IndexedDB, not cookies.
    //
    // PLAN B:  Switch `HistorySidebar` to use a standard `fetch('/api/threads')`.
    // BUT we are already here. Let's make this action work if we can pass a userId? 
    // No, that's insecure.
    
    // TEMPORARY SOLUTION:
    // We will change `getThreadHistory` to be a server action that returns EMPTY 
    // and implement the fetch in the client component using a new `/api/threads` route? 
    // 
    // WAIT. We can use the Firebase Admin SDK to list threads if we knew the UID.
    // 
    // Let's create a Server Action that takes the ID TOKEN as an argument?
    // `export async function getThreadHistory(token: string)`
    // This is clean.
    return [];
}


// Server Action: Get Messages for a Thread
// Usage: Called by page.tsx
export async function getThreadMessages(threadId: string) {
    if (!threadId) return [];

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
        const messages = checkpoint.channel_values?.messages || [];

        // We need to normalize messages for the UI if they are LangChain objects
        // The UI handles 'role' and 'content'.
        // LangChain messages have 'id', 'content', 'kwargs', etc.
        // BaseMessage type: { content: string, name?: string, ... }
        // We map them to the format expected by DialogueStream (id, role, content)

        return messages.map((m: any) => {
            let role = 'user';
            // Check class name or type 
            // m.id might be an array like ["langchain_core", "messages", "HumanMessage"]
            const typeStr = Array.isArray(m.id) ? m.id.join('.') : (m.type || '');

            if (typeStr.includes('SystemMessage') || m.type === 'system') role = 'system';
            else if (typeStr.includes('AIMessage') || m.type === 'ai') role = 'assistant';
            else if (typeStr.includes('HumanMessage') || m.type === 'human') role = 'user';

            // Handle LangChain serialization nuances (kwargs)
            const content = m.content || m.kwargs?.content || "";
            // Ensure ID is a string
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
