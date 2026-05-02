import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, BarChart3, Users, TrendingUp, FileText } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Sales summary", icon: TrendingUp, prompt: "Give me a summary of my sales performance this month." },
  { label: "Follow-ups", icon: Users, prompt: "Which customers need follow-up today?" },
  { label: "Draft promo", icon: FileText, prompt: "Draft a WhatsApp promo message for my best-selling products." },
  { label: "Compare months", icon: BarChart3, prompt: "Compare this month's performance vs last month." },
];

type Message = { role: "user" | "assistant"; content: string; chartData?: any };

export function CopilotPage({ onChat }: { onChat: (q: string, history: Message[]) => Promise<{ reply: string; chartData: any } | null> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const result = await onChat(text, messages);
    if (result) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, chartData: result.chartData }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please check your API key in Settings." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick actions */}
      <div className="px-6 pt-4 pb-2 flex gap-2 flex-wrap">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => send(a.prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">AI Business Copilot</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Ask anything about your business — sales, customers, inventory, or get AI-powered recommendations.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[70%] rounded-2xl px-4 py-3",
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50 backdrop-blur-xl",
            )}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.chartData && (
                <div className="mt-3 bg-white/60 dark:bg-slate-900/60 rounded-xl p-3 border border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">{m.chartData.title}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    {m.chartData.type === "bar" ? (
                      <BarChart data={m.chartData.data}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={m.chartData.data}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50 backdrop-blur-xl rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary typing-dot-1" />
                <div className="h-2 w-2 rounded-full bg-primary typing-dot-2" />
                <div className="h-2 w-2 rounded-full bg-primary typing-dot-3" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            className="flex-1 h-10 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary-dark transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
