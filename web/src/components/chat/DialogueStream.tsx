
import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";


interface DialogueStreamProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    isLoading: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    threadId: string | null;
}

export function DialogueStream({ messages, isLoading, data }: DialogueStreamProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom only if user is already near bottom, or new message arrives
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, data]);

    return (
        <div 
            ref={containerRef}
            className="flex flex-col gap-6 sm:gap-8 px-3 sm:px-8 py-6 sm:py-12 overflow-y-auto h-full scrollbar-none"
        >
            {/* Empty State */}
            {messages.length === 0 && !isLoading && (
                <div className="flex-1 flex items-center justify-center min-h-[50vh] text-muted-foreground/40 italic">
                    The page is blank. The dialogue awaits.
                </div>
            )}

            {/* Message Stream */}
            {messages.map((m) => (
                <div
                    key={m.id}
                    className={cn(
                        "flex flex-col group relative animate-in fade-in slide-in-from-bottom-2 duration-500",
                        m.role === 'user' ? "items-end" : "items-start"
                    )}
                >
                    {/* Role Indicator (Minimalist) */}
                    <span className={cn(
                        "text-[10px] uppercase tracking-widest mb-1.5 opacity-40 font-semibold select-none",
                        m.role === 'user' ? "mr-1" : "ml-1"
                    )}>
                        {m.role === 'user' ? 'Interlocutor' : 'Sophia'}
                    </span>

                    {/* Check for empty content (e.g. initial assistant state) */}
                    {m.content === "" && m.role === 'assistant' && isLoading && messages.indexOf(m) === messages.length - 1 ? (
                         <ThinkingIndicator />
                    ) : (
                        <div
                        className={cn(
                            "max-w-[85%] sm:max-w-prose rounded-none px-0 py-0 text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words",
                             // Typography for User
                             m.role === 'user' 
                                ? "font-sans text-right text-muted-foreground font-light tracking-wide" 
                                : "font-serif text-left text-foreground font-normal sm:text-[1.1rem]"
                        )}
                    >
                        {m.role === 'user' ? (
                            <span>{m.content}</span>
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Custom components for specific styling
                                    p: ({ children }) => <p className="mb-4 sm:mb-6 last:mb-0 leading-7 sm:leading-8">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-primary/80">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 sm:pl-6 mb-4 space-y-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 sm:pl-6 mb-4 space-y-2">{children}</ol>,
                                    li: ({ children }) => <li className="pl-1 sm:pl-2">{children}</li>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 border-primary/20 pl-4 sm:pl-5 italic my-4 sm:my-6 text-muted-foreground/80">
                                            {children}
                                        </blockquote>
                                    ),
                                    code: ({ children, className }) => {
                                        const isInline = !className;
                                         if (isInline) {
                                            return <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono text-primary/70">{children}</code>
                                         }
                                        return (
                                            <code className="block bg-muted/30 p-4 rounded-sm text-sm font-mono overflow-x-auto my-4 border border-border/20">
                                                {children}
                                            </code>
                                        )
                                    },
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline hover:text-primary/80 underline-offset-4 transition-colors">
                                            {children}
                                        </a>
                                    ),
                                }}
                            >
                                {m.content}
                            </ReactMarkdown>
                        )}
                    </div>
                    )}
                   

                    {/* Timestamp / Meta (Hidden by default, visible on hover) */}
                    {/* <div className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground delay-100">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div> */}
                </div>
            ))}

             {/* Thinking Indicator for pure loading state (not streaming yet) */}
             {isLoading && messages[messages.length -1].role !== 'assistant' && (
               <div className="flex flex-col items-start animate-in fade-in duration-700">
                    <span className="text-[10px] uppercase tracking-widest mb-1.5 opacity-40 font-semibold select-none ml-1">
                        Sophia
                    </span>
                   <ThinkingIndicator />
               </div>
            )}

            <div ref={bottomRef} className="h-4" />
        </div>
    );
}

