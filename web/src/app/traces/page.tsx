import { db } from "@/lib/firebase/server";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

interface ThreadSummary {
    id: string;
    latest_checkpoint_id: string;
    updated_at: number;
    preview: string;
}

export default async function TracesPage() {
    try {
        console.log("[TracesPage] Initializing request...");
        const threadsRef = db.collection("threads");

        console.log("[TracesPage] Querying threads collection...");
        const snapshot = await threadsRef
            .orderBy("updated_at", "desc")
            .limit(50)
            .get();

        console.log(`[TracesPage] Fetched ${snapshot.size} threads.`);

        const threads = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ThreadSummary[];

        return (
            <div className="min-h-screen bg-background text-foreground p-8 font-serif">
                {/* ... (keep existing JSX structure just passing the threads) ... */}
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mb-4">
                                <ArrowLeft className="w-4 h-4" /> Back to Stoa
                            </Link>
                            <h1 className="text-3xl font-bold text-primary">Agent Traces</h1>
                            <p className="text-muted-foreground font-sans mt-2">
                                Inspection of recent Socratic dialogues.
                            </p>
                        </div>
                    </div>

                    <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium font-sans border-b border-border">
                                <tr>
                                    <th className="p-4 w-[200px]">Thread ID</th>
                                    <th className="p-4">Last Activity</th>
                                    <th className="p-4">Latest Message</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {threads.map(thread => (
                                    <tr key={thread.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-mono text-xs text-muted-foreground">
                                            {thread.id.slice(0, 8)}...
                                        </td>
                                        <td className="p-4 font-sans text-muted-foreground">
                                            {thread.updated_at ? formatDistanceToNow(thread.updated_at, { addSuffix: true }) : 'Unknown'}
                                        </td>
                                        <td className="p-4 max-w-md truncate text-foreground/80">
                                            "{thread.preview}"
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link href={`/traces/${thread.id}`}>
                                                <Button variant="outline" size="sm" className="font-sans text-xs">
                                                    Inspect
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {threads.length === 0 && (
                            <div className="p-12 text-center text-muted-foreground">
                                No traces found yet. Start a conversation to see it here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error: any) {
        console.error("[TracesPage] Error fetching traces:", error);
        return (
            <div className="min-h-screen bg-background text-foreground p-8 font-serif flex items-center justify-center">
                <div className="border border-red-500/20 bg-red-500/10 p-8 rounded-lg max-w-lg text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Traces</h2>
                    <p className="text-sm font-mono whitespace-pre-wrap text-left bg-black/20 p-4 rounded mb-4 text-red-300">
                        {error.message || String(error)}
                    </p>
                    <Link href="/">
                        <Button variant="outline">Back to Stoa</Button>
                    </Link>
                </div>
            </div>
        );
    }
}
