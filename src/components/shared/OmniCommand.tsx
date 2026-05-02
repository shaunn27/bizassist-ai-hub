import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Search, Command, ArrowRight, MessageSquare, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/appContext";

export function OmniCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { setActiveChatId } = useApp();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const actions = [
    {
      id: "action-1",
      icon: MessageSquare,
      title: "Draft reply to latest unread message",
      subtitle: "AI Agent will compose a contextual response",
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      onSelect: () => {
        router.navigate({ to: "/messages" });
        setOpen(false);
      }
    },
    {
      id: "action-2",
      icon: AlertTriangle,
      title: "Show critical alerts",
      subtitle: "Filter dashboard for immediate action items",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      onSelect: () => {
        router.navigate({ to: "/" });
        setOpen(false);
      }
    },
    {
      id: "action-3",
      icon: Zap,
      title: "Configure Integrations",
      subtitle: "Connect WhatsApp, Shopify, or Instagram",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      onSelect: () => {
        router.navigate({ to: "/integrations" });
        setOpen(false);
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" 
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 mr-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-900 dark:text-white placeholder-slate-400"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            AI Actions
          </div>
          <div className="space-y-1">
            {actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase())).map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onSelect}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-colors", action.bg, action.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {action.title}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {action.subtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-500">BizAssist AI</span> is listening
          </div>
          <div>Press Esc to close</div>
        </div>
      </div>
    </div>
  );
}
