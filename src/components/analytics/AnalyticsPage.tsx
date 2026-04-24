import {
  Download,
  FileText,
  MessageCircle,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  MessagesByHourChart,
  OrdersWeekLineChart,
  RevenueAreaChart,
  StatusDonutChart,
} from "./Charts";
import {
  messagesByHour,
  ordersThisWeek,
  revenueThisWeek,
  orderStatusBreakdown,
  agentPerformance,
  aiPerformance,
  recentFlags,
} from "@/data/mockAnalytics";
import { Badge } from "@/components/shared/Badge";
import { toast } from "@/components/shared/Toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

const KPIS = [
  { icon: MessageCircle, label: "Messages", value: "47" },
  { icon: Package, label: "Orders", value: "12" },
  { icon: DollarSign, label: "Revenue", value: "RM1,840" },
  { icon: Clock, label: "Avg Response", value: "4.2 min" },
  { icon: AlertTriangle, label: "AI Flags", value: "12" },
  { icon: CheckCircle2, label: "Resolved", value: "31" },
];

export function AnalyticsPage() {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const flags = recentFlags.filter((f) => filter === "all" || f.severity === filter);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <div className="flex gap-2">
            <button
              onClick={() => toast("CSV exported", "success")}
              className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => toast("PDF report generated", "success")}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> PDF Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <k.icon className="h-4 w-4 text-primary" />
                <Badge variant="primary">Today</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-2">Messages per Hour</h3>
            <MessagesByHourChart data={messagesByHour} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-2">Orders This Week</h3>
            <OrdersWeekLineChart data={ordersThisWeek} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-2">Revenue This Week</h3>
            <RevenueAreaChart data={revenueThisWeek} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-2">Order Status</h3>
            <StatusDonutChart data={orderStatusBreakdown} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">AI Performance</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase">
                  <th className="text-left font-medium pb-2">Metric</th>
                  <th className="text-right font-medium pb-2">Today</th>
                  <th className="text-right font-medium pb-2">Week</th>
                </tr>
              </thead>
              <tbody>
                {aiPerformance.map((a) => (
                  <tr key={a.metric} className="border-t border-border">
                    <td className="py-2 text-foreground">{a.metric}</td>
                    <td className="py-2 text-right font-semibold">{a.today}</td>
                    <td className="py-2 text-right font-semibold">{a.week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Agents</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase">
                  <th className="text-left font-medium pb-2">Agent</th>
                  <th className="text-right font-medium pb-2">Chats</th>
                  <th className="text-right font-medium pb-2">Reply</th>
                  <th className="text-right font-medium pb-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((a) => (
                  <tr key={a.agent} className="border-t border-border">
                    <td className="py-2 font-medium text-foreground">{a.agent}</td>
                    <td className="py-2 text-right">{a.chats}</td>
                    <td className="py-2 text-right">{a.avgReply}</td>
                    <td className="py-2 text-right">{a.ordersClosed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">AI Issues Flagged Today</h3>
            <div className="flex gap-1">
              {(["all", "critical", "warning", "info"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-1.5">
            {flags.map((f, i) => (
              <li key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50">
                <Badge
                  variant={
                    f.severity === "critical"
                      ? "danger"
                      : f.severity === "warning"
                        ? "warning"
                        : "primary"
                  }
                >
                  {f.severity.toUpperCase()}
                </Badge>
                <span className="text-sm text-foreground">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
