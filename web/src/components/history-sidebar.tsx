"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area" // Assuming you have this or standard div scroll
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react"

import { getThreadHistory, deleteThread } from "@/actions/history"
import { useAuth } from "@/context/auth-context"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useTheme } from "next-themes"

interface Thread {
    id: string
    title?: string
    updated_at?: number
    preview?: string
}

interface HistorySidebarProps {
    currentThreadId: string | null
    onSelectThread: (threadId: string | null) => void
    className?: string
}

export function HistorySidebar({ currentThreadId, onSelectThread, className }: HistorySidebarProps) {
    const { user } = useAuth()
    const [threads, setThreads] = React.useState<Thread[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isOpen, setIsOpen] = React.useState(false) // For mobile/collapsible logic if needed

    // Load threads on mount/auth
    React.useEffect(() => {
        if (!user) {
            setThreads([]); 
            setIsLoading(false);
            return;
        }

        async function load() {
            try {
                const data = await getThreadHistory();
                setThreads(data);
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [user, currentThreadId]); // Reload often or set up subscription? Reload on thread switch is okay for now.

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this inquiry?")) return;

        // Optimistic update
        setThreads(prev => prev.filter(t => t.id !== id));
        if (currentThreadId === id) onSelectThread(null);

        try {
            await deleteThread(id);
        } catch (err) {
            console.error("Failed to delete", err);
            // Revert? (Not strictly necessary for MVP)
        }
    };

    return (
        <>
            {/* Desktop: Sidebar Trigger / Logic */}
            {/* Mobile: Sheet? For now, let's just make it a hidden panel or a simple popover if requested. 
                But per requirements, it's a "Left Sidebar". 
                Let's assume it's a collapsible drawer or part of the layout. 
                Given the 'layout' is in page.tsx, we'll render a simple button here that expands/overlays.
            */}
            
            {/* Simple Mobile/Desktop Trigger for now - A "History" Icon */}
            <div className={cn("relative", className)}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn("opacity-70 hover:opacity-100", isOpen && "bg-accent opacity-100")}
                    title="History"
                >
                    <div className="relative">
                         <MessageSquare className="h-[1.2rem] w-[1.2rem]" />
                         {/* Optional notification dot if unread? Nah. */}
                    </div>
                </Button>

                {/* Dropdown / Popover Pane */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 max-w-[90vw] bg-popover/95 backdrop-blur-md border border-border shadow-lg rounded-md z-50 animate-in fade-in zoom-in-95 origin-top-left flex flex-col max-h-[60vh]">
                        {/* Header */}
                        <div className="p-3 border-b border-border/40 flex justify-between items-center sticky top-0 bg-popover/95 z-10 backdrop-blur-md rounded-t-md">
                            <span className="text-sm font-medium opacity-70 ml-1">Inquiries</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => {
                                    onSelectThread(null);
                                    setIsOpen(false);
                                }}
                                title="New Inquiry"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {isLoading && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin opacity-50"/>
                                </div>
                            )}

                            {!isLoading && threads.length === 0 && (
                                <div className="p-4 text-xs text-muted-foreground text-center italic">
                                    No past inquiries found.
                                </div>
                            )}

                            {threads.map(thread => (
                                <div 
                                    key={thread.id}
                                    onClick={() => {
                                        onSelectThread(thread.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "group flex items-center justify-between p-2 rounded-sm text-sm cursor-pointer transition-colors hover:bg-accent/50",
                                        currentThreadId === thread.id ? "bg-accent font-medium text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="truncate">{thread.title || "New Inquiry"}</span>
                                        <span className="text-[10px] opacity-50 truncate font-mono">
                                            {new Date(thread.updated_at || Date.now()).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => handleDelete(e, thread.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Backdrop for mobile closing */}
                {isOpen && (
                     <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setIsOpen(false)}
                     />
                )}
            </div>
        </>
    )
}
