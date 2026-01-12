
import { auth } from "./server";
import { DecodedIdToken } from "firebase-admin/auth";
import { headers } from "next/headers";

export async function verifyAuth(): Promise<DecodedIdToken | null> {
    const headersList = await headers();
    const token = headersList.get("authorization")?.split("Bearer ")[1];

    if (!token) {
        return null;
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error("Error verifying auth token:", error);
        return null;
    }
}
