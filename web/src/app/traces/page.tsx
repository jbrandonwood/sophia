import { db } from "@/lib/firebase/server";
import { format } from "date-fns";
import { ArrowLeft, Clock, List, Terminal, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const dynamic = 'force-dynamic';

interface TraceThread {
    id: string;
    title?: string;
    updated_at: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function getTraceThreads() {
    try {
        const snapshot = await db.collection("threads")
            .orderBy("updated_at", "desc")
            .limit(50)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as TraceThread[];
    } catch (e: unknown) {
        console.error("Error fetching trace threads:", e);
        throw e;
    }
}

export default async function TracesPage() {
    let threads: TraceThread[] = [];
    let error: Error | null = null;

    try {
        threads = await getTraceThreads();
    } catch (e) {
        error = e as Error;
    }

    if (error) {
        return (
            <div className="flex flex-col h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto w-full space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-3xl font-serif">Internal Traces</h1>
                    </div>
                    <div className="p-6 border border-destructive/50 bg-destructive/5 rounded-lg flex items-start gap-4 text-destructive">
                        <AlertCircle className="w-6 h-6 mt-1" />
                        <div>
                            <h2 className="text-lg font-bold">Failed to load traces</h2>
                            <p className="text-sm opacity-90">Please ensure Firebase connectivity is correctly configured.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="p-6 border-b border-secondary/20 flex justify-between items-center bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-serif">Internal Traces</h1>
                        <p className="text-xs text-muted-foreground font-sans uppercase tracking-[0.2em]">Diagnostic Execution Logs</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">Environment: Production</Badge>
                </div>
            </header>

            {/* List */}
            <main className="flex-1 overflow-hidden bg-secondary/5">
                <ScrollArea className="h-full">
                    <div className="max-w-5xl mx-auto p-8">
                        <div className="grid grid-cols-1 gap-4">
                            {threads.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-secondary/20 rounded-xl">
                                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-muted-foreground italic">No active traces found in the archive.</p>
                                </div>
                            ) : (
                                threads.map((thread) => (
                                    <Link key={thread.id} href={`/traces/${thread.id}`}>
                                        <div className="group p-6 bg-card border border-secondary/20 rounded-xl hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                    <List className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                                                        {thread.title || "Untitled Discourse"}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground font-sans uppercase tracking-wider">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {thread.updated_at ? format(thread.updated_at.toDate ? thread.updated_at.toDate() : new Date(thread.updated_at), "MMM d, HH:mm") : "Recently"}
                                                        </span>
                                                        <span className="opacity-40">|</span>
                                                        <span className="font-mono text-[10px]">{thread.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowLeft className="w-5 h-5 rotate-180" />
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
