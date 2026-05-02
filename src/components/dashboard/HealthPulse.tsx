import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/appContext";

type HealthComponent = {
  name: string;
  score: number;
  weight: number;
  status: "good" | "warning" | "critical";
};

type HealthResult = {
  score: number;
  trend: "improving" | "stable" | "declining";
  components: HealthComponent[];
  alertMessage: string;
  recommendedAction: string;
};

function computeFallback(m: {
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalOrders: number;
  openChats: number;
  avgResponseTime: number;
  unresolvedFlags: number;
  lowStockProducts: number;
  totalProducts: number;
  customerCount: number;
  activeCustomersCount: number;
}): HealthResult {
  const completionRate = m.totalOrders > 0 ? (m.completedOrders / m.totalOrders) * 100 : 50;
  const stockHealth = m.totalProducts > 0 ? ((m.totalProducts - m.lowStockProducts) / m.totalProducts) * 100 : 80;
  const score = Math.round(
    completionRate * 0.3 +
    (100 - Math.min(m.avgResponseTime * 5, 100)) * 0.2 +
    stockHealth * 0.2 +
    (m.activeCustomersCount / Math.max(m.customerCount, 1)) * 100 * 0.15 +
    Math.max(0, 100 - m.unresolvedFlags * 10) * 0.15
  );
  return {
    score,
    trend: score >= 65 ? "improving" : score >= 40 ? "stable" : "declining",
    components: [
      { name: "Revenue", score: Math.round(completionRate), weight: 30, status: completionRate >= 70 ? "good" : completionRate >= 40 ? "warning" : "critical" },
      { name: "Response Time", score: Math.round(100 - Math.min(m.avgResponseTime * 5, 100)), weight: 20, status: m.avgResponseTime <= 5 ? "good" : m.avgResponseTime <= 15 ? "warning" : "critical" },
      { name: "Inventory", score: Math.round(stockHealth), weight: 20, status: stockHealth >= 80 ? "good" : stockHealth >= 50 ? "warning" : "critical" },
      { name: "Customer Health", score: Math.round((m.activeCustomersCount / Math.max(m.customerCount, 1)) * 100), weight: 15, status: "good" },
      { name: "Operations", score: Math.round(Math.max(0, 100 - m.unresolvedFlags * 10)), weight: 15, status: m.unresolvedFlags <= 2 ? "good" : m.unresolvedFlags <= 5 ? "warning" : "critical" },
    ],
    alertMessage: `Business health score: ${score}/100. ${m.pendingOrders} pending orders need attention.`,
    recommendedAction: score >= 70 ? "Business is healthy. Focus on growth opportunities." : score >= 40 ? "Address pending orders and improve response times." : "Urgent: Multiple areas need immediate attention.",
  };
}

const statusColor = (s: string) =>
  s === "good" ? "bg-emerald-500" : s === "warning" ? "bg-amber-500" : "bg-rose-500";
const scoreColor = (s: number) =>
  s >= 66 ? "text-emerald-500" : s >= 40 ? "text-amber-500" : "text-rose-500";
const gaugeColor = (s: number) =>
  s >= 66 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";

export function HealthPulse() {
  const { orders, chats, products, customers, settings } = useApp();
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pending = orders.filter((o) => o.status === "Pending");
    const completed = orders.filter((o) => o.status === "Delivered");
    const openChats = chats.filter((c) => c.status === "open");
    const activeCustomers = customers.filter((c) => c.status === "Active");
    const lowStock = products.filter((p) => p.stock !== -1 && p.stock <= 20);

    const metrics = {
      totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      pendingOrders: pending.length,
      completedOrders: completed.length,
      totalOrders: orders.length,
      openChats: openChats.length,
      avgResponseTime: 4.2,
      unresolvedFlags: openChats.filter((c) => c.flagged).length,
      lowStockProducts: lowStock.length,
      totalProducts: products.length,
      customerCount: customers.length,
      activeCustomersCount: activeCustomers.length,
    };

    if (settings.apiKey) {
      import("@/server/healthPulse.functions").then(({ generateHealthPulse }) => {
        generateHealthPulse({ data: { apiKey: settings.apiKey, model: settings.model || "deepseek-v4-flash", metrics } })
          .then((result) => { setHealth(result); setLoading(false); })
          .catch(() => { setHealth(computeFallback(metrics)); setLoading(false); });
      });
    } else {
      setHealth(computeFallback(metrics));
      setLoading(false);
    }
  }, [orders.length, chats.length, products.length, customers.length, settings.apiKey]);

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = health ? circumference - (health.score / 100) * circumference : circumference;
  const trendIcon = health?.trend === "improving" ? TrendingUp : health?.trend === "declining" ? TrendingDown : Minus;

  return (
    <div className="bg-gradient-to-br from-violet-500/10 via-sky-500/10 to-emerald-500/10 dark:from-violet-500/15 dark:via-sky-500/15 dark:to-emerald-500/15 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">AI Health Pulse</h3>
          <p className="text-xs text-muted-foreground">Real-time business health score</p>
        </div>
        {health && (
          <div className="ml-auto flex items-center gap-1.5">
            {(() => { const Icon = trendIcon; return <Icon className={cn("h-4 w-4", health.trend === "improving" ? "text-emerald-500" : health.trend === "declining" ? "text-rose-500" : "text-amber-500")} />; })()}
            <span className={cn("text-sm font-semibold capitalize", health.trend === "improving" ? "text-emerald-600" : health.trend === "declining" ? "text-rose-600" : "text-amber-600")}>
              {health.trend}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Analyzing metrics...</span>
        </div>
      )}

      {!loading && health && (
        <div className="flex gap-8 items-start">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 180, height: 180 }}>
              <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200 dark:text-slate-700" />
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke={gaugeColor(health.score)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-[2s] ease-out"
                  style={{ filter: `drop-shadow(0 0 8px ${gaugeColor(health.score)}40)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-4xl font-black", scoreColor(health.score))}>
                  <AnimatedCounter target={health.score} />
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">out of 100</span>
              </div>
            </div>
            {health.alertMessage && (
              <div className="mt-3 flex items-start gap-1.5 max-w-[180px]">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{health.alertMessage}</p>
              </div>
            )}
          </div>

          {/* Breakdown bars */}
          <div className="flex-1 space-y-3">
            {health.components.map((c, i) => (
              <div key={c.name} className="animate-bar-fill" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", statusColor(c.status))} />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{c.weight}% weight</span>
                    <span className={cn("text-sm font-bold", scoreColor(c.score))}>{c.score}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-[1.5s] ease-out", statusColor(c.status))}
                    style={{ width: `${c.score}%`, animationDelay: `${i * 150 + 300}ms` }}
                  />
                </div>
              </div>
            ))}

            {health.recommendedAction && (
              <div className="mt-4 bg-gradient-to-r from-violet-500/20 to-sky-500/20 rounded-xl p-3 border border-violet-200/50 dark:border-violet-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Recommendation
                </div>
                <p className="text-xs text-foreground font-medium">{health.recommendedAction}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
