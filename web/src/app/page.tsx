"use client";

import { useAuth } from "@/context/auth-context";
import { DialogueStream } from "@/components/chat/DialogueStream";
import { LogicSidebar } from "@/components/logic-sidebar";
import { HistorySidebar } from "@/components/history-sidebar";
import { Separator } from "@/components/ui/separator";
import { UserSettingsMenu } from "@/components/user-settings-menu";

import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { useState, useEffect, useRef } from "react";
import { getThreadMessages } from "@/actions/history";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Home() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const data = undefined; // Placeholder for thinking stream
  const formRef = useRef<HTMLFormElement>(null);

  // Initial greeting state
  const [initialMessage, setInitialMessage] = useState<string>("The unexamined life is not worth living. Do you agree?");
  const hasFetchedPrompt = useRef(false);
  const ignoreHistoryFetch = useRef(false);

  // Load Initial Prompt
  useEffect(() => {
    // Only fetch if we don't have a thread ID and haven't fetched yet
    if (!threadId && !hasFetchedPrompt.current) {
      hasFetchedPrompt.current = true;
      fetch('/api/prompt/initial')
        .then(res => res.json())
        .then(data => {
          if (data.prompt) {
            setInitialMessage(data.prompt);
            // Update messages if we are still showing the initial state
            setMessages(current => {
              if (current.length === 1 && current[0].id === '1') {
                return [{
                  id: '1',
                  role: 'assistant',
                  content: data.prompt
                }];
              }
              return current;
            });
          }
        })
        .catch(err => console.error("Failed to fetch prompt:", err));
    }
  }, [threadId]);

  // Load Request
  useEffect(() => {
    async function load() {
      if (!threadId) {
        setMessages([{
          id: '1',
          role: 'assistant' as const,
          content: initialMessage
        }]);
        return;
      }

      if (ignoreHistoryFetch.current) {
        ignoreHistoryFetch.current = false;
        return;
      }

      setIsLoading(true);
      try {
        const history = await getThreadMessages(threadId);
        if (history && history.length > 0) {
          // Cast roles from dynamic data to fixed set
          const typedHistory = history.map((m: { id: string; role: string; content: string }) => ({
            ...m,
            role: m.role as 'user' | 'assistant' | 'system'
          }));
          setMessages(typedHistory);
        } else {
          setMessages([{
            id: '1',
            role: 'assistant' as const,
            content: initialMessage
          }]);
        }
      } catch (e) {
        console.error("Failed to load thread", e);
        setMessages([{
          id: '1',
          role: 'assistant' as const,
          content: initialMessage
        }]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [threadId, initialMessage]);


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!user) return; // Guard

    const userContent = input;
    setInput("");
    setIsLoading(true);

    // Optimistic update
    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user' as const, content: userContent }
    ];
    setMessages(newMessages);

    try {
      // Get ID token
      const token = await user.getIdToken();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: newMessages,
          threadId: threadId
        })
      });

      if (!response.ok) throw new Error(response.statusText);

      const threadHeader = response.headers.get('x-sophia-thread-id');
      if (threadHeader && threadHeader !== threadId) {
        ignoreHistoryFetch.current = true;
        setThreadId(threadHeader);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      // Add placeholder for assistant
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '' }
      ]);

      const decoder = new TextDecoder();
      let assistantContent = "";

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        buffer += text;

        const lines = buffer.split('\n');
        // Keep the last segment (potentially incomplete) in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.substring(2));
              if (content) {
                assistantContent += content;
                // Update state specifically for the assistant message
                setMessages(currentMessages => {
                  const updated = [...currentMessages];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === 'assistant') {
                    lastMsg.content = assistantContent;
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.warn("Parse error", e);
            }
          }
        }
      }

    } catch (err: unknown) {
      setError(err as Error);
      console.error("Custom Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground transition-colors duration-500 overscroll-none">
      {/* Header */}
      <header className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-8 border-b border-border/40 bg-background/95 backdrop-blur-sm z-10 sticky top-0 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* History Sidebar (Left) */}
          <HistorySidebar
            currentThreadId={threadId}
            onSelectThread={setThreadId}
          />
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-primary font-bold truncate">
            Sophia
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LogicSidebar />
          <UserSettingsMenu />
        </div>
      </header>

      {/* Main Dialogue Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm text-center border-b border-destructive/20">
              An error occurred: {error.message}
            </div>
          )}
          <div className="flex-1 overflow-hidden min-h-0">
            <DialogueStream messages={messages} isLoading={isLoading} data={data} threadId={threadId} />
          </div>

          {/* Input Area */}
          <div className="p-3 sm:p-6 pb-4 sm:pb-8 bg-background">
            <div className="max-w-prose mx-auto relative">
              <Separator className="mb-2 sm:mb-4 bg-primary/10" />
              <form onSubmit={handleSubmit} ref={formRef} className="relative flex items-end gap-2">
                <AutoResizeTextarea
                  className="w-full bg-transparent border-none text-base sm:text-lg font-serif focus:ring-0 placeholder:text-muted-foreground/50 resize-none py-3 sm:py-4 pr-20 focus:outline-none min-h-[44px] sm:min-h-[56px] px-0 shadow-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Respond to the inquiry..."
                  autoFocus
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={onKeyDown}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-0 bottom-2 sm:bottom-3 rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-0 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
