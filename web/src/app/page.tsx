
"use client";

import { useAuth } from "@/context/auth-context";
import { LogOut } from "lucide-react";
import { DialogueStream } from "@/components/chat/DialogueStream";
import { LogicSidebar } from "@/components/logic-sidebar";
import { Separator } from "@/components/ui/separator";
import { useChat } from "ai/react";

export default function Home() {
  const { user, signOut } = useAuth();

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Welcome to the Stoa. We begin with a simple premise: that the unexamined life is not worth living. Do you agree?'
      }
    ]
  });

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
