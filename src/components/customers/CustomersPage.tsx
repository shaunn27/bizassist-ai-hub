import { useState } from "react";
import { mockCustomers, type Customer } from "@/data/mockCustomers";
import { Badge } from "@/components/shared/Badge";
import { Search, X } from "lucide-react";

export function CustomersPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Customer | null>(null);
  const list = mockCustomers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers..." className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <select className="h-9 px-3 rounded-md border border-border bg-background text-sm"><option>All status</option><option>Active</option><option>Inactive</option></select>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground uppercase border-b border-border"><th className="text-left font-medium p-3">Customer</th><th className="text-right font-medium p-3">Orders</th><th className="text-right font-medium p-3">Spent</th><th className="text-left font-medium p-3">Last active</th><th className="text-left font-medium p-3">Status</th><th></th></tr></thead>
            <tbody>{list.map(c => (
              <tr key={c.id} className="border-b border-border hover:bg-accent/30">
                <td className="p-3"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: c.avatarColor }}>{c.initials}</div><div><div className="font-medium text-foreground">{c.name}</div><div className="text-xs text-muted-foreground">{c.phone}</div></div></div></td>
                <td className="p-3 text-right">{c.totalOrders}</td>
                <td className="p-3 text-right font-semibold">RM{c.totalSpent}</td>
                <td className="p-3 text-muted-foreground">{c.lastActive}</td>
                <td className="p-3"><Badge variant={c.status === "Active" ? "success" : "default"}>{c.status}</Badge></td>
                <td className="p-3 text-right"><button onClick={() => setActive(c)} className="text-xs text-primary font-medium hover:underline">View</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-[80] bg-foreground/40 flex justify-end animate-fade-in" onClick={() => setActive(null)}>
          <div className="w-[440px] bg-card border-l border-border h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full text-white font-bold flex items-center justify-center" style={{ background: active.avatarColor }}>{active.initials}</div><div><div className="font-bold text-foreground">{active.name}</div><div className="text-xs text-muted-foreground">{active.phone}</div></div></div>
              <button onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-xs text-muted-foreground">Loyal customer since {active.loyalSince}</div>
              <div className="bg-primary-soft border border-primary/30 rounded-md p-3"><div className="text-[10px] uppercase font-bold text-primary-dark dark:text-accent-foreground mb-1">AI Behavior Summary</div><p className="text-xs text-foreground">{active.behaviorSummary}</p></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-secondary rounded-md"><div className="text-lg font-bold">{active.totalOrders}</div><div className="text-[10px] uppercase text-muted-foreground">Orders</div></div>
                <div className="p-3 bg-secondary rounded-md"><div className="text-lg font-bold">RM{active.totalSpent}</div><div className="text-[10px] uppercase text-muted-foreground">Lifetime</div></div>
                <div className="p-3 bg-secondary rounded-md"><div className="text-lg font-bold">RM{active.avgOrderValue}</div><div className="text-[10px] uppercase text-muted-foreground">Avg</div></div>
              </div>
              <div><div className="text-xs font-semibold mb-2">Preferred products</div><div className="flex flex-wrap gap-1">{active.preferredProducts.map(p => <Badge key={p} variant="primary">{p}</Badge>)}</div></div>
              <div><div className="text-xs font-semibold mb-2">Order history</div><ul className="space-y-1.5">{active.orderHistory.map(o => (<li key={o.id} className="flex justify-between text-xs border border-border rounded-md p-2"><div><span className="font-mono text-muted-foreground">{o.id}</span> · {o.items}</div><div className="font-semibold">RM{o.amount}</div></li>))}</ul></div>
              <div><div className="text-xs font-semibold mb-1">Last conversation</div><p className="text-xs text-muted-foreground italic bg-secondary p-2 rounded-md">"{active.lastConversationExcerpt}"</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
