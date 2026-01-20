
import { db } from "@/lib/firebase/server";
import Link from "next/link";
import { ArrowLeft, Clock, Database, MessageSquare, Terminal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkpoint } from "@langchain/langgraph";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

interface Citation {
    source: string;
    text: string;
    uri?: string;
}

interface AgentStateValues {
    messages?: any[];
    ragCitations?: Citation[];
    vertexSearchCount?: number;
    currentPhase?: string;
    responseStyle?: string;
    __start__?: any; // Internal LangGraph key
}

export default async function TraceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
                            Trace: {threadId.slice(0, 8)}...
                        </h1>
                        <p className="text-xs text-muted-foreground font-sans">
                            {checkpoints.length} Steps Recorded
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden bg-secondary/5">
                <ScrollArea className="h-full">
                    <div className="max-w-4xl mx-auto p-8 space-y-12">
                        {checkpoints.map((step, index) => {
                            const state = step.checkpoint.channel_values as AgentStateValues;
                            // writes is unreliable in FirestoreSaver current setup, rely on state snapshots
                            const source = step.metadata.source;
                            const phase = state.currentPhase || 'unknown';

                            let stepType = 'generic';
                            let stepIcon = <Terminal className="w-4 h-4" />;
                            let stepTitle = `Step ${index + 1}: ${source}`;
                            let content: React.ReactNode = null;

                            // --- 1. User Input ---
                            // Often associated with source='input' or the initial step having __start__
                            // @ts-ignore - weird internal key
                            const startParams = state.__start__;
                            if (source === 'input' || (index === 0 && startParams)) {
                                stepType = 'input';
                                stepIcon = <MessageSquare className="w-4 h-4" />;
                                stepTitle = "User Input";

                                const inputMessages = startParams?.messages ? startParams.messages : (state.messages || []);
                                // If input messages found in __start__, use them.
                                if (Array.isArray(inputMessages) && inputMessages.length > 0) {
                                    const msg = inputMessages[inputMessages.length - 1]; // usually just one
                                    const text = typeof msg.kwargs?.content === 'string' ? msg.kwargs.content : JSON.stringify(msg.kwargs?.content || msg.content);
                                    content = (
                                        <div className="p-4 bg-primary/5 text-foreground rounded-md font-sans border border-primary/10">
                                            {text}
                                        </div>
                                    );
                                }
                            }

                            // --- 2. Examine (Analysis/Search) ---
                            else if (phase === 'examine') {
                                stepType = 'search';
                                stepIcon = <Database className="w-4 h-4" />;
                                stepTitle = "Examine (Vertex AI Search)";

                                if (state.ragCitations && state.ragCitations.length > 0) {
                                    content = (
                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-md border border-blue-200 dark:border-blue-900/30">
                                            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Database className="w-3 h-3" /> Artifacts Retrieved ({state.ragCitations.length})
                                            </h4>
                                            <div className="space-y-3">
                                                {state.ragCitations.map((cit, i) => (
                                                    <div key={i} className="flex flex-col gap-1 text-sm bg-background/50 p-2 rounded">
                                                        <div className="font-semibold text-foreground/80 font-sans">
                                                            {cit.source}
                                                        </div>
                                                        <div className="text-muted-foreground text-xs pl-2 border-l-2 border-primary/30 italic line-clamp-3 hover:line-clamp-none transition-all">
                                                            "{cit.text}"
                                                        </div>
                                                        {cit.uri && (
                                                            <div className="text-[10px] font-mono text-muted-foreground opacity-70 truncate">
                                                                {cit.uri}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    content = (
                                        <div className="p-4 bg-yellow-50/50 dark:bg-yellow-950/10 rounded-md border border-yellow-200 dark:border-yellow-900/30">
                                            <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                                                <span>⚠️</span> No relevant artifacts found in corpus.
                                            </p>
                                        </div>
                                    );
                                }
                            }

                            // --- 3. Aporia (Response) ---
                            else if (phase === 'aporia') {
                                stepType = 'output';
                                stepIcon = <MessageSquare className="w-4 h-4" />;
                                stepTitle = "Aporia (Generation)";

                                // Show the LAST message in the state, which should be the AI response
                                const messages = state.messages || [];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg) {
                                    const text = typeof lastMsg.kwargs?.content === 'string' ? lastMsg.kwargs.content : JSON.stringify(lastMsg.kwargs?.content || lastMsg.content);
                                    content = (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Agent Output
                                            </span>
                                            <div className="p-4 bg-muted text-foreground rounded-lg text-sm whitespace-pre-wrap font-sans border border-border">
                                                {text}
                                            </div>
                                        </div>
                                    );
                                }
                            }

                            return (
                                <div key={step.id} className="relative pl-10 border-l-2 border-primary/20 pb-8 last:pb-0 last:border-l-0">
                                    <div className="absolute -left-[11px] top-0 bg-background p-1 rounded-full border border-primary/20">
                                        <div className="bg-primary/10 text-primary rounded-full p-1">
                                            {stepIcon}
                                        </div>
                                    </div>

                                    <Card className="border-border bg-card shadow-sm overflow-hidden">
                                        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border flex flex-row items-center justify-between space-y-0">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-primary">
                                                    {stepTitle}
                                                </CardTitle>
                                                {state.currentPhase && <Badge variant="outline" className="text-[10px]">{state.currentPhase}</Badge>}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {new Date(step.created_at).toLocaleTimeString()}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-4 space-y-4">
                                            {/* Main Content Rendered Above */}
                                            {content}

                                            {/* Debug State Accordion */}
                                            <Accordion type="single" collapsible className="w-full border-t border-border/50 pt-2">
                                                <AccordionItem value="debug" className="border-0">
                                                    <AccordionTrigger className="py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:no-underline">
                                                        Raw State (Debug)
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="mt-2 text-[10px] font-mono overflow-hidden">
                                                            <div className="mb-2 font-bold text-muted-foreground">Full Channel Values (Snippet)</div>
                                                            <pre className="overflow-x-auto p-2 bg-muted/30 rounded border border-border max-h-[200px]">
                                                                {JSON.stringify(state, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
