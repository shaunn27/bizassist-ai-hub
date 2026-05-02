import { useState } from "react";
import { Upload, Users, Package, Calendar, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/appContext";

type ParseResult = {
  customers: { name: string; phone: string; notes: string }[];
  orders: { customerName: string; items: string; total: number; date: string }[];
  meetings: { customerName: string; date: string; time: string; purpose: string }[];
  complaints: { customerName: string; issue: string; severity: string }[];
};

export function ImportPage({ onParse }: { onParse: (text: string) => Promise<ParseResult | null> }) {
  const { createOrder, createMeeting, products } = useApp();
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [imported, setImported] = useState(false);

  const parse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);
    setImported(false);
    const interval = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 15, 90)), 300);
    const res = await onParse(rawText);
    clearInterval(interval);
    setProgress(100);
    setResult(res);
    setLoading(false);
  };

  const importAll = () => {
    if (!result) return;
    for (const o of result.orders) {
      createOrder({ customerId: "imported", customerName: o.customerName, items: o.items, total: o.total });
    }
    for (const m of result.meetings) {
      createMeeting({ customerId: "imported", customerName: m.customerName, purpose: m.purpose, date: m.date, time: m.time, duration: "1h" });
    }
    setImported(true);
  };

  const cardClass = "bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/50 p-4";

  return (
    <div className="h-full overflow-y-auto p-6 max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
          <Upload className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">AI WhatsApp Import</h2>
          <p className="text-xs text-muted-foreground">Paste WhatsApp chat export to extract customers, orders, meetings & complaints</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste WhatsApp chat export here...\n\nExample:\n5/3/24, 10:30 AM - Sarah: Hi! I'd like to order 2x Chocolate Cake\n5/3/24, 10:31 AM - Sarah: Can deliver tomorrow at 3pm?\n5/3/24, 10:45 AM - Ahmad: My order #1234 hasn't arrived yet!`}
            className="w-full h-[300px] p-4 rounded-xl border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-4">
          <button
            onClick={parse}
            disabled={!rawText.trim() || loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary-dark transition-colors"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse with AI
              </>
            )}
          </button>
          {loading && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}% complete</p>
            </div>
          )}
          {result && !imported && (
            <button
              onClick={importAll}
              className="w-full h-10 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Import All to CRM
            </button>
          )}
          {imported && (
            <div className="flex items-center gap-2 justify-center text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Imported successfully!
            </div>
          )}
          <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 border border-border">
            <p className="text-xs font-semibold text-foreground mb-2">Supported formats</p>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li>• WhatsApp chat export (.txt)</li>
              <li>• Date/Time message format</li>
              <li>• Group or individual chats</li>
              <li>• English & Malay messages</li>
            </ul>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-sky-500" />
              <span className="font-bold text-foreground">Customers</span>
              <span className="ml-auto text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full font-semibold">{result.customers.length}</span>
            </div>
            <ul className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {result.customers.map((c, i) => (
                <li key={i} className="text-xs bg-secondary rounded-md p-2">
                  <span className="font-semibold">{c.name}</span> <span className="text-muted-foreground">{c.phone}</span>
                  {c.notes && <p className="text-muted-foreground mt-0.5">{c.notes}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-emerald-500" />
              <span className="font-bold text-foreground">Orders</span>
              <span className="ml-auto text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">{result.orders.length}</span>
            </div>
            <ul className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {result.orders.map((o, i) => (
                <li key={i} className="text-xs bg-secondary rounded-md p-2 flex justify-between">
                  <span><span className="font-semibold">{o.customerName}</span> · {o.items}</span>
                  <span className="font-bold">RM{o.total}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-violet-500" />
              <span className="font-bold text-foreground">Meetings</span>
              <span className="ml-auto text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-semibold">{result.meetings.length}</span>
            </div>
            <ul className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {result.meetings.map((m, i) => (
                <li key={i} className="text-xs bg-secondary rounded-md p-2">
                  <span className="font-semibold">{m.customerName}</span> · {m.date} {m.time} · {m.purpose}
                </li>
              ))}
            </ul>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-foreground">Complaints</span>
              <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">{result.complaints.length}</span>
            </div>
            <ul className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {result.complaints.map((c, i) => (
                <li key={i} className="text-xs bg-secondary rounded-md p-2">
                  <span className="font-semibold">{c.customerName}</span> · <span className={cn(c.severity === "high" ? "text-rose-500" : "text-muted-foreground")}>{c.issue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
