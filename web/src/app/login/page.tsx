"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push("/");
        } catch (e: unknown) {
            console.error("Login failed:", e);
            setError((e as Error).message || "Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F9F8F4] p-4">
            <Card className="w-full max-w-md shadow-xl border-none">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-serif text-primary italic">S</span>
                    </div>
                    <CardTitle className="text-3xl font-serif italic text-primary">Entrance to the Stoa</CardTitle>
                    <CardDescription className="text-muted-foreground font-sans uppercase tracking-[0.2em] text-[10px]">
                        Dialogues on the Nature of Truth
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-sm text-muted-foreground italic leading-relaxed">
                        "The unexamined life is not worth living."
                    </p>
                    
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20 text-center">
                            {error}
                        </div>
                    )}

                    <Button 
                        onClick={handleLogin} 
                        disabled={loading}
                        className="w-full h-12 text-lg font-serif"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Opening Portal...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <LogIn className="w-5 h-5" />
                                Begin Inquiry
                            </span>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
