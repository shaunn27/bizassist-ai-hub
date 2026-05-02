import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  MessageCircle,
  Package,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertCircle,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Play,
  Square,
  Heart,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { MessagesByHourChart, OrdersWeekLineChart } from "./Charts";
import { AiActivityFeed } from "./AiActivityFeed";
import {
  messagesByHour,
  ordersThisWeek,
  recentFlags,
  aiImpactMetrics,
} from "@/data/mockAnalytics";
import { useApp } from "@/lib/appContext";
import { useAI } from "@/hooks/useAI";
import { cn } from "@/lib/utils";
import { simulateCustomerReply } from "@/server/customerSimulator";
import { generateReportPDF } from "@/utils/pdfExport";

const SIMULATION_MESSAGES = [
  { customerId: "c2", text: "Hi, I need to check my order status." },
  { customerId: "c4", text: "Do you have this in large?" },
  { customerId: "c1", text: "Can I cancel my reservation?" },
  { customerId: "c5", text: "Thanks, the items arrived!" },
];

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaUp,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  sub?: string;
}) {
  return (
    <div className="group relative overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start justify-between z-10">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors duration-300">
            {value}
          </div>
          {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
        </div>
        <div className="h-12 w-12 rounded-2xl bg-sky-100/80 dark:bg-sky-900/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-500 dark:group-hover:bg-sky-500 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all duration-500">
          <Icon className="h-6 w-6 text-sky-600 dark:text-sky-400 group-hover:text-white transition-colors duration-300" />
        </div>
      </div>

      {delta && (
        <div
          className={cn(
            "mt-5 flex items-center gap-1.5 text-xs font-semibold z-10 relative",
            deltaUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
          )}
        >
          {deltaUp ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{delta}</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const {
    setActiveChatId,
    business,
    products,
    meetings,
    customers,
    addCustomerMessage,
    addNotification,
    createOrder,
    chats,
    orders,
    settings,
  } = useApp();
  const { getDailyBriefing, getBusinessReport, error: aiError } = useAI();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedMetrics, setSimulatedMetrics] = useState({
    messages: 47,
    orders: 8,
  });
  const [briefing, setBriefing] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const lowStock = products.filter((p) => p.stock !== -1 && p.stock <= 20);
  const upcoming = meetings.filter((m) => m.status !== "Done").slice(0, 3);

  const sevIcon = (s: string) => {
    if (s === "critical") return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    if (s === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    return <Info className="h-4 w-4 text-sky-500 shrink-0" />;
  };

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.6) {
        // Add an AI-generated customer message
        const targetCust = customers[Math.floor(Math.random() * customers.length)];
        if (targetCust) {
          const thread = chats.find(c => c.customerId === targetCust.id);
          const productCatalog = products
            .map(p => `${p.name} (${p.sku}) RM${p.price}`)
            .join("; ");
          
          void simulateCustomerReply({
            data: {
              customerId: targetCust.id,
              customerName: targetCust.name,
              messages: thread?.messages || [{
                id: "init",
                from: "agent",
                type: "text",
                text: "Hi, how can I help you today?",
                time: "09:00 AM",
                timestamp: Date.now() - 100000
              }],
              productCatalog
            }
          }).then(res => {
            if (res.reply) {
              addCustomerMessage(targetCust.id, res.reply);
              setSimulatedMetrics((prev) => ({ ...prev, messages: prev.messages + 1 }));
            }
          });
        }
      } else if (rand > 0.3) {
        // Add an order
        const cust = customers[Math.floor(Math.random() * customers.length)];
        createOrder({
          customerId: cust.id,
          customerName: cust.name,
          items: "1x Premium Widget",
          total: 120.0,
        });
        setSimulatedMetrics((prev) => ({ ...prev, orders: prev.orders + 1 }));
      } else {
        // Add a notification
        addNotification({
          severity: "info",
          text: "System performance is optimal.",
        });
      }
    }, 4500); // New event every 4.5 seconds

    return () => clearInterval(interval);
  }, [isSimulating, addCustomerMessage, addNotification, createOrder, customers]);

  // AI Daily Briefing
  useEffect(() => {
    if (!settings.apiKey) return;
    setBriefingLoading(true);
    const openChats = chats.filter(c => c.status === "open");
    const pending = orders.filter(o => o.status === "Pending");
    void getDailyBriefing({
      openChats: openChats.length,
      pendingOrders: pending.length,
      pendingOrderValue: pending.reduce((sum, o) => sum + o.total, 0),
      meetingsToday: meetings.filter(m => m.status !== "Done").length,
      lowStockProducts: products.filter(p => p.stock !== -1 && p.stock <= 20).map(p => ({ name: p.name, stock: p.stock })),
      flaggedConversations: openChats.filter(c => c.flagged).map(c => ({
        customerName: customers.find(cu => cu.id === c.customerId)?.name || "Unknown",
        reason: c.flagged === "critical" ? "Critical flag" : "Needs attention",
        waitMinutes: c.waitingMinutes,
      })),
      angryCustomers: [],
    }).then((result) => {
      setBriefing(result);
      setBriefingLoading(false);
    });
  }, [settings.apiKey, chats.length, orders.length]);

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="relative z-10 p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div>
            <div 
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/60 dark:border-slate-700/50 shadow-sm cursor-pointer transition-all",
                isSimulating ? "ring-2 ring-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] animate-pulse" : "hover:bg-white/80 dark:hover:bg-slate-700/50"
              )}
              title="Double-click to toggle Live Demo Mode"
            >
              <Sparkles className={cn("h-3.5 w-3.5", isSimulating ? "text-sky-500 animate-spin-slow" : "text-sky-500")} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                {isSimulating ? "AI Engine Synchronizing..." : "AI Engine Active"}
              </span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              Overview
              <span className="text-sky-600 dark:text-sky-400 font-medium">· {business}</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Welcome back, Sarah. Here's what's happening with your AI assistants today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                setReportOpen(true);
                setReportLoading(true);
                setReportError(null);
                setReport(null);
                try {
                  const pending = orders.filter(o => o.status === "Pending");
                  const completed = orders.filter(o => o.status === "Delivered");
                  const productRevenue: Record<string, { name: string; quantity: number; revenue: number }> = {};
                  for (const o of orders) {
                    const key = o.items;
                    if (!productRevenue[key]) productRevenue[key] = { name: o.items, quantity: 0, revenue: 0 };
                    productRevenue[key].quantity++;
                    productRevenue[key].revenue += o.total;
                  }
                  const topProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                  const customerSpent: Record<string, { name: string; orders: number; spent: number }> = {};
                  for (const o of orders) {
                    if (!customerSpent[o.customerId]) customerSpent[o.customerId] = { name: o.customerName, orders: 0, spent: 0 };
                    customerSpent[o.customerId].orders++;
                    customerSpent[o.customerId].spent += o.total;
                  }
                  const topCustomers = Object.values(customerSpent).sort((a, b) => b.spent - a.spent).slice(0, 5);
                  const result = await getBusinessReport({
                    businessName: business,
                    period: "This Month",
                    totalOrders: orders.length,
                    totalRevenue: orders.reduce((s, o) => s + o.total, 0),
                    pendingOrders: pending.length,
                    completedOrders: completed.length,
                    topProducts,
                    topCustomers,
                    openChats: chats.filter(c => c.status === "open").length,
                    resolvedChats: chats.filter(c => c.status === "resolved").length,
                    avgResponseTime: "4.2 min",
                    sentimentBreakdown: { positive: 12, neutral: 8, negative: 3 },
                    meetingsHeld: meetings.filter(m => m.status === "Done").length,
                    upcomingMeetings: meetings.filter(m => m.status !== "Done").length,
                    lowStockItems: products.filter(p => p.stock !== -1 && p.stock <= 20).map(p => ({ name: p.name, stock: p.stock })),
                  });
                  if (result) {
                    setReport(result);
                  } else {
                    setReportError(aiError || "Server returned no result. Check your API key in Settings.");
                  }
                } catch (err: any) {
                  setReportError(err?.message || String(err));
                }
                setReportLoading(false);
              }}
              className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 dark:shadow-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Generate Report
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* AI Daily Briefing */}
        {briefingLoading && !briefing && (
          <div className="bg-gradient-to-r from-violet-500/10 via-sky-500/10 to-emerald-500/10 dark:from-violet-500/20 dark:via-sky-500/20 dark:to-emerald-500/20 rounded-2xl border border-violet-200/50 dark:border-violet-500/30 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-violet-500 animate-pulse" />
              <span className="text-lg font-bold text-foreground">AI Daily Briefing</span>
              <span className="text-xs bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-semibold">Generating...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" />
              Analyzing your business data...
            </div>
          </div>
        )}
        {briefing && (
          <div className="bg-gradient-to-r from-violet-500/10 via-sky-500/10 to-emerald-500/10 dark:from-violet-500/20 dark:via-sky-500/20 dark:to-emerald-500/20 rounded-2xl border border-violet-200/50 dark:border-violet-500/30 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-violet-500" />
                <span className="text-lg font-bold text-foreground">AI Daily Briefing</span>
                <span className="text-2xl">{briefing.overallMood || "🌟"}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            {briefing.greeting && (
              <p className="text-sm text-foreground font-medium mb-4">{briefing.greeting}</p>
            )}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-rose-500">{briefing.urgentItems?.length || 0}</div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Urgent Items</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{briefing.churnRiskCount || 0}</div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Churn Risks</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-500">RM{briefing.revenueAtRisk || 0}</div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Revenue at Risk</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-sky-500">{briefing.inventoryAlertCount || 0}</div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Stock Alerts</div>
              </div>
            </div>
            {briefing.urgentItems?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {briefing.urgentItems.map((item: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100/80 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertCircle className="h-3 w-3" />
                    {item}
                  </span>
                ))}
              </div>
            )}
            {briefing.topPriorityAction && (
              <div className="bg-gradient-to-r from-violet-500/20 to-sky-500/20 rounded-xl p-3 border border-violet-200/50 dark:border-violet-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Today's Priority
                </div>
                <p className="text-sm text-foreground font-medium">{briefing.topPriorityAction}</p>
              </div>
            )}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            icon={MessageCircle}
            label="Total Messages"
            value={simulatedMetrics.messages.toString()}
            delta="↑ 12%"
            deltaUp
          />
          <MetricCard icon={Package} label="Pending Orders" value={simulatedMetrics.orders.toString()} sub="3 urgent requiring attention" />
          <MetricCard icon={Clock} label="Avg Response" value="4.2m" delta="↓ 0.8 min" deltaUp />
          <MetricCard icon={AlertTriangle} label="AI Flags" value="12" sub="2 critical flags today" />
        </div>

        {/* AI Business Impact */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">AI Business Impact</h2>
            <Badge variant="primary">Live</Badge>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {aiImpactMetrics.map((m) => {
              const Icon = m.icon === "clock" ? Clock : m.icon === "cart" ? Package : m.icon === "timer" ? TrendingUp : m.icon === "heart" ? Heart : m.icon === "chat" ? MessageCircle : Shield;
              return (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center">
                  <Icon className="h-5 w-5 text-primary mb-2" />
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{m.label}</div>
                  <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-1">{m.delta}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="group bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Messages Volume</h3>
              </div>
              <Badge variant="primary" className="bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">Today</Badge>
            </div>
            <MessagesByHourChart data={messagesByHour} />
          </div>

          <div className="group bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Orders Trend</h3>
              </div>
              <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">+18%</Badge>
            </div>
            <OrdersWeekLineChart data={ordersThisWeek} />
          </div>
        </div>

        {/* AI Action Area */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Action Required
              </h3>
              <button className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold transition-colors">
                View all flags
              </button>
            </div>
            <ul className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {recentFlags.map((f, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setActiveChatId(f.customerId);
                      router.navigate({ to: "/messages" });
                    }}
                    className="w-full group flex items-start gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md transition-all text-left"
                  >
                    <div className="mt-0.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-900/50 group-hover:scale-110 transition-transform">
                      {sevIcon(f.severity)}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                      {f.text}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all mt-1" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-[450px] relative rounded-2xl overflow-hidden shadow-sm group">
            {/* Soft border for the feed container */}
            <div className="absolute inset-0 rounded-2xl border border-white/60 dark:border-slate-800/60 pointer-events-none z-20" />
            <AiActivityFeed />
          </div>
        </div>

        {/* Secondary Info Area */}
        <div className="grid grid-cols-2 gap-6 pb-8">
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                Upcoming Meetings
              </h3>
              <button
                onClick={() => router.navigate({ to: "/meetings" })}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold transition-colors"
              >
                View calendar
              </button>
            </div>
            <ul className="space-y-3">
              {upcoming.map((m) => {
                const cust = customers.find((c) => c.id === m.customerId);
                return (
                  <li
                    key={m.id}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-white/80 dark:hover:border-slate-700"
                  >
                    <div
                      className="h-10 w-10 rounded-full text-white font-bold text-sm flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform"
                      style={{ background: cust?.avatarColor }}
                    >
                      {cust?.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {m.customerName}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{m.purpose}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{m.time}</div>
                      <Badge
                        variant={m.status === "Scheduled" ? "primary" : "warning"}
                        className="mt-1 shadow-sm"
                      >
                        {m.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Inventory Alerts
              </h3>
              <button
                onClick={() => router.navigate({ to: "/catalog" })}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold transition-colors"
              >
                Manage stock
              </button>
            </div>
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-white/80 dark:hover:border-slate-700"
                >
                  <div
                    className="h-10 w-10 rounded-lg text-white font-bold text-sm flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform"
                    style={{ background: p.color }}
                  >
                    {p.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{p.name}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      SKU {p.sku} · RM{p.price}
                    </div>
                  </div>
                  <Badge variant={p.stock === 0 ? "danger" : "warning"} className="shadow-sm">
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </Badge>
                </li>
              ))}
              <li className="flex items-center gap-2 pt-3 mt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Synced with primary database 5m ago
              </li>
            </ul>
          </div>
        </div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[80] bg-foreground/40 flex items-center justify-center animate-fade-in" onClick={() => setReportOpen(false)}>
          <div className="w-[700px] max-h-[85vh] bg-card border border-border rounded-xl shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span className="font-bold text-foreground">AI Business Report</span>
              </div>
              <div className="flex items-center gap-2">
                {report && (
                  <button
                    onClick={async () => {
                      const doc = await generateReportPDF(report);
                      doc.save(`${business.replace(/\s+/g, "-")}-report.pdf`);
                    }}
                    className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
                  >
                    Export PDF
                  </button>
                )}
                <button onClick={() => setReportOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <AlertTriangle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {reportLoading && !report && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-8 w-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">AI is analyzing your business data...</p>
                </div>
              )}
              {!reportLoading && !report && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-destructive font-medium">
                    {reportError || "Failed to generate report. Check your API key in Settings."}
                  </p>
                </div>
              )}
              {report && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{report.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{report.generatedAt}</p>
                  </div>
                  {report.overallScore && (
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "px-4 py-2 rounded-lg text-white font-bold text-lg",
                        report.overallScore >= 75 ? "bg-green-500" : report.overallScore >= 50 ? "bg-amber-500" : "bg-red-500",
                      )}>
                        {report.overallScore}/100
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Overall Health Score</div>
                        <div className="text-sm text-muted-foreground">Risk Level: <span className="font-semibold">{(report.riskLevel || "medium").toUpperCase()}</span></div>
                      </div>
                    </div>
                  )}
                  <div className="bg-primary-soft border border-primary/20 rounded-lg p-4">
                    <div className="text-xs uppercase font-bold text-primary mb-1">Executive Summary</div>
                    <p className="text-sm text-foreground">{report.executiveSummary}</p>
                  </div>
                  {(report.sections || []).map((section: any, i: number) => (
                    <div key={i}>
                      <h3 className="font-bold text-foreground text-sm mb-2">{section.heading}</h3>
                      <p className="text-sm text-muted-foreground">{section.content}</p>
                      {section.highlights?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {section.highlights.map((h: string, j: number) => (
                            <span key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              • {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
