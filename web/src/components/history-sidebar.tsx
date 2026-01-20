"use client";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, MessageSquare, PlusCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getUserThreads, deleteThread } from "@/actions/history";
import { ThreadMetadata } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useState } from "react";

interface HistorySidebarProps {
    currentThreadId: string | null;
    onSelectThread: (threadId: string | null) => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function HistorySidebar({ currentThreadId, onSelectThread, isOpen, onOpenChange }: HistorySidebarProps) {
    const { user } = useAuth();
    const [threads, setThreads] = useState<ThreadMetadata[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchThreads = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserThreads(user.uid);
            setThreads(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Refetch when sheet opens
    useEffect(() => {
        if (isOpen) {
            fetchThreads();
        }
    }, [isOpen, fetchThreads]);

    // Initial fetch
    useEffect(() => {
        if (user) fetchThreads();
    }, [user, fetchThreads]);

    const handleDelete = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        if (!user) return;
        if (!confirm("Are you sure you want to delete this inquiry?")) return;

        const success = await deleteThread(threadId, user.uid);
        if (success) {
            setThreads(prev => prev.filter(t => t.id !== threadId));
            if (currentThreadId === threadId) {
                onSelectThread(null);
            }
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-accent/50 text-muted-foreground hover:text-foreground">
                    <History className="w-5 h-5" />
                    <span className="sr-only">History</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] font-sans border-r-border/40 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="mb-6">
                    <SheetTitle className="font-serif text-2xl text-foreground flex items-center gap-2">
                        <History className="w-5 h-5 opacity-50" />
                        Stoa Memory
                    </SheetTitle>
                    <SheetDescription className="hidden">
                        Your philosophical inquiries.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full pb-10">
                    <Button
                        onClick={() => {
                            onSelectThread(null);
                            onOpenChange?.(false);
                        }}
                        className="mb-6 w-full justify-start gap-2 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 shadow-sm"
                        variant="ghost"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Inquiry
                    </Button>

                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                        Recent Dialogues
                    </h3>

                    <ScrollArea className="flex-1 -mx-4 px-4">
                        {loading && threads.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8">Loading history...</div>
                        ) : threads.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8 italic opacity-50">
                                No recorded dialogues yet.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {threads.map(thread => (
                                    <div
                                        key={thread.id}
                                        className={`group flex items-center gap-2 p-3 rounded-md cursor-pointer transition-all duration-200 border border-transparent ${currentThreadId === thread.id
                                            ? "bg-accent text-accent-foreground border-border/50 shadow-sm"
                                            : "hover:bg-accent/40 hover:text-foreground text-muted-foreground"
                                            }`}
                                        onClick={() => {
                                            onSelectThread(thread.id);
                                            onOpenChange?.(false);
                                        }}
                                    >
                                        <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate leading-tight mb-0.5">
                                                {thread.title}
                                            </p>
                                            <p className="text-[10px] opacity-60 truncate font-mono">
                                                {formatDistanceToNow(thread.updated_at)} ago
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, thread.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive/50 hover:text-destructive rounded-full transition-all"
                                            title="Delete thread"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    )
}
