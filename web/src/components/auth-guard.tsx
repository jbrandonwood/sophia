
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user && pathname !== "/login") {
                router.push("/login");
            }
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="animate-pulse">Loading Sophia...</div>
            </div>
        );
    }

    if (!user && pathname !== "/login") {
        return null; // Will redirect
    }

    return <>{children}</>;
}
