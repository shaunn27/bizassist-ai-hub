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
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { MessagesByHourChart, OrdersWeekLineChart } from "./Charts";
import {
  messagesByHour,
  ordersThisWeek,
  agentPerformance,
  recentFlags,
} from "@/data/mockAnalytics";
import { mockProducts } from "@/data/mockProducts";
import { mockMeetings } from "@/data/mockMeetings";
import { mockCustomers } from "@/data/mockCustomers";
import { useApp } from "@/lib/appContext";
import { cn } from "@/lib/utils";

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
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary-soft flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {delta && (
        <div
          className={cn(
            "mt-3 flex items-center gap-1 text-xs font-semibold",
            deltaUp ? "text-success" : "text-success",
          )}
        >
          {deltaUp ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span>{delta}</span>
          <span className="text-muted-foreground font-normal">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const { setActiveChatId, business } = useApp();
  const lowStock = mockProducts.filter((p) => p.stock !== -1 && p.stock <= 20);
  const upcoming = mockMeetings.filter((m) => m.status !== "Done").slice(0, 3);

  const sevIcon = (s: string) => {
    if (s === "critical") return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
    if (s === "warning") return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
    return <Info className="h-4 w-4 text-primary shrink-0" />;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">
            Welcome back, Sarah · <span className="text-foreground font-medium">{business}</span>
          </p>
          <h2 className="text-2xl font-bold text-foreground mt-0.5">Today's Overview</h2>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            icon={MessageCircle}
            label="Total Messages Today"
            value="47"
            delta="↑ 12%"
            deltaUp
          />
          <MetricCard icon={Package} label="Pending Orders" value="8" sub="3 urgent" />
          <MetricCard icon={Clock} label="Avg Response Time" value="4.2 min" delta="↓ 0.8 min" />
          <MetricCard icon={AlertTriangle} label="AI Flags Today" value="12" sub="2 critical" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Messages by Hour</h3>
              <Badge variant="primary">Today</Badge>
            </div>
            <MessagesByHourChart data={messagesByHour} />
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Orders This Week</h3>
              <Badge variant="success">+18%</Badge>
            </div>
            <OrdersWeekLineChart data={ordersThisWeek} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Recent AI Flags</h3>
              <button className="text-xs text-primary hover:underline font-medium">View all</button>
            </div>
            <ul className="space-y-2">
              {recentFlags.map((f, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setActiveChatId(f.customerId);
                      router.navigate({ to: "/messages" });
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    {sevIcon(f.severity)}
                    <span className="text-sm text-foreground flex-1">{f.text}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Agent Performance</h3>
              <Badge variant="default">Today</Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase">
                  <th className="text-left font-medium pb-2">Agent</th>
                  <th className="text-right font-medium pb-2">Chats</th>
                  <th className="text-right font-medium pb-2">Avg Reply</th>
                  <th className="text-right font-medium pb-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((a) => (
                  <tr key={a.agent} className="border-t border-border">
                    <td className="py-2.5 font-medium text-foreground">{a.agent}</td>
                    <td className="py-2.5 text-right text-foreground">{a.chats}</td>
                    <td className="py-2.5 text-right text-foreground">{a.avgReply}</td>
                    <td className="py-2.5 text-right text-foreground">{a.ordersClosed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Upcoming Meetings</h3>
              <button
                onClick={() => router.navigate({ to: "/meetings" })}
                className="text-xs text-primary hover:underline font-medium"
              >
                View all
              </button>
            </div>
            <ul className="space-y-2.5">
              {upcoming.map((m) => {
                const cust = mockCustomers.find((c) => c.id === m.customerId);
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50"
                  >
                    <div
                      className="h-9 w-9 rounded-full text-white font-bold text-xs flex items-center justify-center"
                      style={{ background: cust?.avatarColor }}
                    >
                      {cust?.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {m.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.purpose}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-foreground">{m.time}</div>
                      <Badge
                        variant={m.status === "Scheduled" ? "primary" : "warning"}
                        className="mt-0.5"
                      >
                        {m.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Low Stock Alerts</h3>
              <button
                onClick={() => router.navigate({ to: "/catalog" })}
                className="text-xs text-primary hover:underline font-medium"
              >
                View catalog
              </button>
            </div>
            <ul className="space-y-2.5">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50"
                >
                  <div
                    className="h-9 w-9 rounded-md text-white font-bold text-sm flex items-center justify-center"
                    style={{ background: p.color }}
                  >
                    {p.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU {p.sku} · RM{p.price}
                    </div>
                  </div>
                  <Badge variant={p.stock === 0 ? "danger" : "warning"}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </Badge>
                </li>
              ))}
              <li className="flex items-center gap-3 p-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Inventory synced from business database 5 min ago
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
