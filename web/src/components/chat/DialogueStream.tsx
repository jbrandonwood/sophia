import { ScrollArea } from "@/components/ui/scroll-area"
import { Message } from "@ai-sdk/react"
import ReactMarkdown from "react-markdown"

export function DialogueStream({ messages }: { messages: Message[] }) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="flex flex-col space-y-8 py-6 px-4">
                {messages.map((message) => (
                    <div key={message.id} className="flex flex-col space-y-2 max-w-prose mx-auto w-full animate-in fade-in duration-500">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans">
                            {message.role === "user" ? "Interlocutor" : "Sophia"}
                        </span>
                        <div className="pl-4 border-l-2 border-primary/20 text-lg leading-relaxed font-serif text-foreground prose dark:prose-invert">
                            <ReactMarkdown>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}
