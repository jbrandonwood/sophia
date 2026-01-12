
import { db } from "@/lib/firebase/server";
import Link from "next/link";
import { ArrowLeft, Clock, Box, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkpoint } from "@langchain/langgraph";

export const dynamic = 'force-dynamic';

interface CheckpointDoc {
    id: string;
    checkpoint: string;
    metadata: string;
    created_at: number;
}

export default async function TraceDetailPage({ params }: { params: { id: string } }) {
    // Await params object for Next.js 15+ (or strict types) safely? 
    // In strict environments awaiting params is often required recently.
    const { id: threadId } = await params;

    const snapshot = await db.collection(`threads/${threadId}/checkpoints`)
        .orderBy("created_at", "asc")
        .get();

    const checkpoints = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            checkpoint: JSON.parse(data.checkpoint) as Checkpoint,
            metadata: JSON.parse(data.metadata),
            created_at: data.created_at
        };
    });

    return (
        <div className="flex flex-col h-screen bg-background text-foreground font-serif">
            {/* Header */}
            <header className="border-b border-border py-4 px-8 flex items-center justify-between bg-card text-card-foreground">
                <div className="flex items-center gap-4">
                    <Link href="/traces" className="text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-primary font-mono tracking-tighter">
                            Trace: {threadId}
                        </h1>
                        <p className="text-xs text-muted-foreground font-sans">
                            {checkpoints.length} Steps Recorded
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content: Split View? For simple MVP, just a list */}
            <div className="flex-1 overflow-hidden bg-secondary/10">
                <ScrollArea className="h-full">
                    <div className="max-w-5xl mx-auto p-8 space-y-8">
                        {checkpoints.map((step, index) => {
                            const isAI = step.metadata.source === 'loop' && (step.checkpoint.channel_values?.messages as any[])?.length > 0; // Rough heuristic

                            // Trying to identify the node
                            const writes = step.metadata.writes;
                            const nodeName = writes ? Object.keys(writes)[0] : 'Unknown';

                            return (
                                <div key={step.id} className="relative pl-8 border-l-2 border-primary/20 pb-8 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 ring-4 ring-background" />

                                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                                        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs px-2 py-1 rounded bg-primary/10 text-primary uppercase font-bold">
                                                    Step {index + 1}: {nodeName || step.metadata.source}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-sans flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(step.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="font-mono text-xs text-muted-foreground">
                                                {step.id.slice(0, 8)}
                                            </div>
                                        </div>

                                        <div className="p-0">
                                            {/* Data Inspection */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
                                                {/* State View */}
                                                <div className="p-4 space-y-2">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                                                        <Box className="w-3 h-3" /> State
                                                    </h4>
                                                    <pre className="text-[10px] sm:text-xs font-mono bg-muted/30 p-3 rounded overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                                                        {JSON.stringify(step.checkpoint.channel_values, null, 2)}
                                                    </pre>
                                                </div>

                                                {/* Metadata View */}
                                                <div className="p-4 space-y-2">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                                                        <MessageSquare className="w-3 h-3" /> Writes (Delta)
                                                    </h4>
                                                    <pre className="text-[10px] sm:text-xs font-mono bg-muted/30 p-3 rounded overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                                                        {JSON.stringify(step.metadata.writes, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
