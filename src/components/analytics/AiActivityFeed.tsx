import { useState, useEffect } from "react";
import { Bot, FileText, MessageSquare, Package, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type AiEvent = {
  id: string;
  type: "message" | "order" | "system" | "task";
  text: string;
  timestamp: Date;
  status: "processing" | "done";
};

const MOCK_EVENTS = [
  { type: "message", text: "AI categorized incoming message from John as 'Urgent Support'" },
  { type: "task", text: "AI drafted a suggested reply for invoice query" },
  { type: "order", text: "AI verified inventory for Order #ORD-8921" },
  { type: "system", text: "AI synchronized catalog with supplier database" },
  { type: "message", text: "AI detected negative sentiment; escalated to human agent" },
  { type: "order", text: "AI auto-approved recurring order for Jane Doe" },
  { type: "task", text: "AI scheduled follow-up meeting with ApexBuild" },
  { type: "system", text: "AI generated daily summary report" },
  { type: "message", text: "AI translated incoming message from Spanish to English" },
  { type: "order", text: "AI flagged unusual purchase pattern for review" },
] as const;

export function AiActivityFeed() {
  const [events, setEvents] = useState<AiEvent[]>([]);

  useEffect(() => {
    // Initial events
    const initial: AiEvent[] = [
      { id: "1", type: "system", text: "AI Agent initialized and monitoring...", timestamp: new Date(Date.now() - 60000), status: "done" },
      { id: "2", type: "message", text: "AI analyzed recent conversation history", timestamp: new Date(Date.now() - 30000), status: "done" },
    ];
    setEvents(initial);

    // Add new event periodically
    const interval = setInterval(() => {
      const randomEvent = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
      
      const newEvent: AiEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: randomEvent.type,
        text: randomEvent.text,
        timestamp: new Date(),
        status: "processing",
      };

      setEvents(prev => {
        const next = [newEvent, ...prev].slice(0, 8); // Keep last 8 events
        return next;
      });

      // Mark as done after random delay between 1-2.5s
      const processingTime = Math.floor(Math.random() * 1500) + 1000;
      setTimeout(() => {
        setEvents(current => 
          current.map(e => e.id === newEvent.id ? { ...e, status: "done" } : e)
        );
      }, processingTime);

    }, 3500); // New event every 3.5s

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "message": return <MessageSquare className="h-4 w-4" />;
      case "order": return <Package className="h-4 w-4" />;
      case "task": return <FileText className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Live AI Activity Stream</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          Agent Active
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border z-0"></div>
        {events.map((event) => (
          <div key={event.id} className="relative z-10 flex gap-3 animate-in fade-in slide-in-from-left-2 duration-500">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 border-card",
              event.status === "processing" ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"
            )}>
              {event.status === "processing" ? <Clock className="h-4 w-4 animate-spin" /> : getIcon(event.type)}
            </div>
            <div className="flex-1 bg-muted/30 rounded-lg p-2.5 text-sm border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "font-medium flex items-center gap-1.5",
                  event.status === "processing" ? "text-primary" : "text-foreground"
                )}>
                  {event.status === "done" && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                  {event.text}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {event.status === "processing" && <span className="text-primary font-medium ml-1">Processing...</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
