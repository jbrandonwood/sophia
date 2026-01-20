import { db } from "@/lib/firebase/server";
import Link from "next/link";
import { ArrowLeft, Clock, Database, MessageSquare, Terminal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface LangGraphMessage {
    id?: string;
    content: string | unknown; // LangGraph content can sometimes be complex, but usually string
    kwargs?: {
        content: string;
    };
    getType: () => string;
}

interface AgentStateValues {
    messages?: LangGraphMessage[];
    documents?: any[];
    currentPhase?: 'elicit' | 'examine' | 'challenge' | 'concede' | 'aporia';
    ragCitations?: Citation[];
    __start__?: {
        messages: LangGraphMessage[];
    };
    [key: string]: Record<string, unknown>;
}

async function getTraceCheckpoints(threadId: string) {
    const snapshot = await db.collection(`threads/${threadId}/checkpoints`)
        .orderBy("created_at", "asc")
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as any[];
}

export default async function TraceDetailPage({ params }: { params: { id: string } }) {
    const threadId = params.id;
    const checkpoints = await getTraceCheckpoints(threadId);

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="p-6 border-b border-secondary/20 flex justify-between items-center bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/traces" className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-serif">Trace Details</h1>
                        <p className="text-xs text-muted-foreground font-sans uppercase tracking-[0.2em]">Thread: <span className="font-mono">{threadId}</span></p>
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

                            let stepIcon = <Terminal className="w-4 h-4" />;
                            let stepTitle = `Step ${index + 1}: ${source}`;
                            let content: React.ReactNode = null;

                            // --- 1. User Input ---
                            // Often associated with source='input' or the initial step having __start__
                            const startParams = state.__start__;
                            if (source === 'input' || (index === 0 && startParams)) {
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
                                                        <span className="font-bold text-blue-800 dark:text-blue-300 text-[10px] uppercase font-serif tracking-tighter">[{cit.source}]</span>
                                                        <p className="italic text-muted-foreground line-clamp-3">"{cit.text}"</p>
                                                        {cit.uri && (
                                                            <Link href={cit.uri} target="_blank" className="text-[10px] text-blue-500 hover:underline truncate mt-1">
                                                                {cit.uri}
                                                            </Link>
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
                                stepIcon = <MessageSquare className="w-4 h-4" />;
                                stepTitle = "Aporia (Generation)";

                                // Show the LAST message in the state, which should be the AI response
                                const messages = state.messages || [];
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg) {
                                    const text = typeof lastMsg.kwargs?.content === 'string' ? lastMsg.kwargs.content : JSON.stringify(lastMsg.kwargs?.content || lastMsg.content);
                                    content = (
                                        <div className="flex flex-col gap-1">
                                            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-md border border-purple-200 dark:border-purple-900/30">
                                                <div className="font-serif text-sm prose dark:prose-invert">
                                                    {text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            }

                            return (
                                <Card key={step.id} className="border-none shadow-none bg-transparent">
                                    <div className="flex gap-6 items-start">
                                        <div className="pt-2 flex flex-col items-center gap-2 group">
                                            <div className="w-8 h-8 rounded-full border border-primary/20 bg-background flex items-center justify-center text-primary/60 shrink-0">
                                                {stepIcon}
                                            </div>
                                            {index < checkpoints.length - 1 && (
                                                <div className="w-[1px] h-full min-h-[40px] bg-primary/10" />
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-muted-foreground"># {index + 1}</span>
                                                    <h3 className="font-serif text-lg tracking-tight">{stepTitle}</h3>
                                                    {phase !== 'unknown' && (
                                                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0 border-primary/20 text-primary">
                                                            {phase}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono opacity-40 uppercase">Source: {source}</span>
                                            </div>

                                            {content}

                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="state" className="border-none">
                                                    <AccordionTrigger className="text-[10px] opacity-40 uppercase hover:opacity-100 hover:no-underline font-mono py-1">
                                                        Inspect Raw State Snapshot
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="p-4 bg-muted rounded-md text-[10px] font-mono leading-relaxed overflow-x-auto">
                                                            <pre>{JSON.stringify(state, null, 2)}</pre>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
