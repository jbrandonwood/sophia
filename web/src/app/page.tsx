"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, Trash2, History, Terminal, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";
import { generateInitialPrompt } from "@/lib/ai/prompts";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { auth } from "@/lib/firebase/client";
import { getConversationHistoryFromClient } from "@/actions/history";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Thread {
  id: string;
  title: string;
  updated_at: Date;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>("");
  const [history, setHistory] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize a new thread
  const startNewInquiry = async () => {
    const newId = uuidv4();
    setThreadId(newId);
    setMessages([]);
    setError(null);
    setInput("");
    
    // Generate initial philosophical prompt
    try {
      const prompt = await generateInitialPrompt();
      setMessages([{ role: 'assistant', content: prompt }]);
    } catch (e) {
      setMessages([{ role: 'assistant', content: "Greetings. What fundamental truth shall we examine today?" }]);
    }
  };

  // Load history from Firestore
  const loadHistory = async () => {
    if (user) {
      const pastThreads = await getConversationHistoryFromClient(user.uid);
      setHistory(pastThreads.map(t => ({
        ...t,
        updated_at: t.updated_at instanceof Date ? t.updated_at : new Date(t.updated_at)
      })));
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      startNewInquiry();
      loadHistory();
    }
  }, [user, authLoading]);

  // Handle scroll
  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Optimistically update
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          messages: newMessages,
          threadId: threadId,
        }),
      });

      if (!response.ok) throw new Error("The dialogue was interrupted.");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to establish intellectual connection.");

      // Initialize AI message placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

      let assistantContent = "";
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6)) as Record<string, unknown>;
              if (data.type === 'text') {
                assistantContent += data.content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  return [...prev.slice(0, -1), { 
                    role: 'assistant', 
                    content: assistantContent 
                  }];
                });
              } else if (data.type === 'status' && data.content === 'deliberating') {
                 // Option to show a spinner or status text
              }
            } catch (err) {
              console.error("Parse error", err);
            }
          }
        }
      }
      
      // Refresh history after message completes
      loadHistory();

    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const resetThread = () => {
    startNewInquiry();
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  if (authLoading) return null;

  return (
    <div className="flex h-screen bg-[#F9F8F4] overflow-hidden">
      {/* Sidebar - Desktop Only for now */}
      <aside className="w-80 border-r border-secondary/20 hidden md:flex flex-col bg-white/50 backdrop-blur-sm">
        <div className="p-6 border-b border-secondary/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif italic text-primary">Sophia</h1>
          </div>
          <Button 
            onClick={resetThread} 
            variant="outline" 
            className="w-full justify-start gap-2 border-secondary/20 bg-transparent hover:bg-secondary/5"
          >
            <MessageSquare className="w-4 h-4" />
            New Inquiry
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-sans uppercase tracking-[0.2em] px-2">
              <History className="w-3 h-3" />
              Past Dialectics
            </div>
            <div className="space-y-1">
              {history.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                      setThreadId(t.id);
                      // In a real app we'd fetch messages for this thread
                      // For now we just reset or alert
                      alert("Historical thread loading disabled in MVP");
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all flex flex-col gap-1 border border-transparent ${t.id === threadId ? 'bg-secondary/10 border-secondary/20 shadow-sm' : 'hover:bg-secondary/5'}`}
                >
                  <span className="font-serif text-foreground truncate">{t.title}</span>
                  <span className="text-[9px] font-sans uppercase tracking-widest text-muted-foreground opacity-60">
                    {t.updated_at.toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-secondary/10 space-y-2">
          <Link href="/traces">
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
              <Terminal className="w-4 h-4" />
              Internal Traces
            </Button>
          </Link>
          <Button 
            onClick={handleSignOut} 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Exit the Stoa
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[#F9F8F4]">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

        {/* Floating Actions (Mobile only) */}
        <div className="md:hidden absolute top-4 left-4 z-20">
            <Button size="icon" variant="ghost" className="bg-white/80 backdrop-blur-sm border border-secondary/10 shadow-sm">
                <History className="w-5 h-5" />
            </Button>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="max-w-prose mx-auto px-6 py-12 md:py-24 space-y-12">
            {messages.length === 0 && (
                <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Terminal className="w-6 h-6 text-primary opacity-40" />
                    </div>
                   <h2 className="text-xl font-serif text-muted-foreground italic">Prepare for the First Inquiry...</h2>
                </div>
            )}
            
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-sans uppercase tracking-[0.3em] font-medium ${m.role === 'user' ? 'text-blue-600' : 'text-primary'}`}>
                    {m.role === 'user' ? 'You' : 'Sophia'}
                  </span>
                  {m.role !== 'user' && <Info className="w-3 h-3 text-primary opacity-20" />}
                </div>
                <div className={`text-lg transition-all duration-500 whitespace-pre-wrap ${m.role === 'user' ? 'font-sans text-blue-900/70 border-r-2 border-blue-600/20 pr-6 pl-2' : 'font-serif text-foreground border-l-2 border-primary/20 pl-6 pr-2'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                    </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col gap-2 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                <span className="text-[10px] font-sans uppercase tracking-[0.3em] font-medium text-primary">
                  Sophia [deliberation]
                </span>
                <div className="pl-6 border-l-2 border-primary/20 flex gap-2 pt-2">
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}

            {error && (
                <div className="p-4 bg-destructive/5 text-destructive border border-destructive/20 rounded-lg text-sm flex items-center gap-3 animate-in fade-in duration-300">
                    <Trash2 className="w-4 h-4" />
                    <span className="italic">{error}</span>
                </div>
            )}
            <div className="h-24"></div>
          </div>
        </ScrollArea>

        {/* Input UI */}
        <div className="p-6 md:pb-12 bg-gradient-to-t from-[#F9F8F4] via-[#F9F8F4] to-transparent pt-12">
          <form 
            onSubmit={handleSubmit}
            className="max-w-prose mx-auto relative group"
          >
            <div className="relative flex items-end gap-2 bg-white/40 backdrop-blur-xl border border-secondary/20 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <AutoResizeTextarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pose your inquiry..."
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 resize-none py-3 px-4 text-lg font-serif placeholder:font-sans placeholder:text-muted-foreground/50"
                    onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                    }
                    }}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={loading || !input.trim()}
                    className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                    <Send className="w-5 h-5" />
                </Button>
            </div>
          </form>
          <div className="text-[9px] text-center mt-4 text-muted-foreground/50 font-sans uppercase tracking-widest flex items-center justify-center gap-3">
            <span>Ontological Discourse Protocol v2.1</span>
            <span className="w-1 h-1 bg-primary/20 rounded-full"></span>
            <span>Vertex AI (Gemini 1.5 Pro)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
