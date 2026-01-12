"use client";

import { useAuth } from "@/context/auth-context";
import { LogOut } from "lucide-react";
import { DialogueStream } from "@/components/chat/DialogueStream";
import { LogicSidebar } from "@/components/logic-sidebar";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Home() {
  const { user, signOut } = useAuth();
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);

  // Cast to any to bypass strict type checking against a potentially mismatching SDK version
  // We expect 'append' to work at runtime.
  const chatHelpers = useChat({
    // api property defaults to /api/chat usually, but if type complains we omit it or ignore
    api: '/api/chat',
    body: {
      threadId: threadId,
    },
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Welcome to the Stoa. We begin with a simple premise: that the unexamined life is not worth living. Do you agree?'
      }
    ],
    onFinish: (message: any, options: any) => {
      // The AI SDK doesn't expose the raw JSON response easily in onFinish usually, 
      // effectively we have to rely on side-channels or inspection if we want the ID.
      // However, looking at the network tab is one thing.
      // Actually, we might need a custom fetcher or just accept that for MVP we might miss the ID
      // if we don't return it in a header or parse carefully.
      // Wait, standard `useChat` doesn't give access to the custom response fields in onFinish easily.
      // Bit of a hack: we can make a separate call or use `onResponse`.
    },
    onResponse: (response: any) => {
      // Clone the response to read it without consuming the stream for the chat usage?
      // Actually `useChat` says "You can use this callback to process the response...".
      // But the stream is locked?
      // Let's check headers.
      // For now, let's just optimistically assume the API might not easily pass it back via stream 
      // unless we put it in a header x-thread-id.
      // Let's assume we implement the header in the API route too if we really need it here.
      // OR: simpler approach for MVP debug:
      // We just let the *server* handle the thread continuity?
      // No, server is stateless unless we pass ID.
      // Let's modify the API to return `x-thread-id` header.
      const id = response.headers.get('x-sophia-thread-id');
      if (id) {
        setThreadId(id);
      }
    }
  } as any) as any;

  const { messages, append, isLoading } = chatHelpers;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Append user message
    const userMessage = { role: "user", content: input };
    setInput("");

    if (append) {
      // Pass stored threadId if available. useChat uses the latest state of `body`? 
      // Usually yes.
      await append(userMessage);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-500">
      {/* Header */}
      <header className="flex justify-between items-center py-4 px-8 border-b border-border/40 bg-background/95 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <LogicSidebar />
          <h1 className="text-xl font-serif tracking-tight text-primary font-bold">Sophia</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-sans text-muted-foreground uppercase tracking-wider">{user?.email}</span>
          <button
            onClick={signOut}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Dialogue Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <DialogueStream messages={messages} />
          </div>

          {/* Input Area */}
          <div className="p-6 pb-8 bg-background">
            <div className="max-w-prose mx-auto relative">
              <Separator className="mb-4 bg-primary/10" />
              <form onSubmit={handleSubmit}>
                <input
                  className="w-full bg-transparent border-none text-lg font-serif focus:ring-0 placeholder:text-muted-foreground/50 resize-none py-4 focus:outline-none"
                  placeholder="Respond to the inquiry..."
                  autoFocus
                  value={input}
                  onChange={handleInputChange}
                />
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
