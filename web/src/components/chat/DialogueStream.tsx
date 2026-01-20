import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown"
import { ThinkingIndicator } from "./ThinkingIndicator"

interface Message {
    id: string;
    role: string;
    content: string;
}

export function DialogueStream({ messages, isLoading, data, threadId }: { messages: Message[], isLoading?: boolean, data?: unknown, threadId?: string | null }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, data, isLoading]);

    // Derive Thinking State from data stream
    const thinkingState = isLoading ? { node: 'thinking' } : null;

    return (
        <div className="h-full overflow-y-auto pr-2 sm:pr-4 scroll-smooth" ref={scrollRef}>
            <div className="flex flex-col space-y-8 sm:space-y-12 py-4 sm:py-8 px-4 sm:px-8 pb-24 sm:pb-32">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic">
                        No messages context initialized.
                    </div>
                )}
                {messages.map((message: Message) => (
                    <div key={message.id} className="flex flex-col space-y-2 sm:space-y-4 mx-auto w-full animate-in fade-in duration-500">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans px-2 sm:px-0">
                                {message.role === "user" ? "Interlocutor" : "Sophia"}
                            </span>
                            {message.role === "assistant" && threadId && (
                                <a
                                    href={`/traces/${threadId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors font-mono cursor-pointer"
                                >
                                    [deliberation]
                                </a>
                            )}
                        </div>
                        <div className="pl-3 sm:pl-4 border-l-2 border-primary/20 text-base sm:text-lg leading-relaxed font-serif text-foreground prose dark:prose-invert break-words max-w-none min-w-0 prose-p:mb-6 prose-headings:mb-4 prose-ul:my-6 prose-li:mb-2">
                            <ReactMarkdown>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="max-w-prose mx-auto w-full pt-4">
                        <ThinkingIndicator state={thinkingState} />
                    </div>
                )}
            </div>
        </div>
    )
}
