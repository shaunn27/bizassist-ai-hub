import { useState } from "react";
import { mockProducts } from "@/data/mockProducts";
import { Badge } from "@/components/shared/Badge";
import { toast } from "@/components/shared/Toast";
import { Search, RefreshCw } from "lucide-react";

export function CatalogPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const products = mockProducts.filter(p => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 px-3 rounded-md border border-border bg-background text-sm"><option>All</option><option>Food</option><option>Retail</option><option>Services</option></select>
          <button onClick={() => toast("Inventory synced from business database", "success")} className="ml-auto h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Sync Inventory</button>
        </div>
        <div className="grid grid-cols-4 gap-4">{products.map(p => {
          const stockStatus = p.stock === -1 ? { v: "primary" as const, label: "Unlimited" } : p.stock === 0 ? { v: "danger" as const, label: "Out of stock" } : p.stock < 20 ? { v: "warning" as const, label: `Low: ${p.stock} left` } : { v: "success" as const, label: `In stock: ${p.stock}` };
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 flex items-center justify-center text-white text-4xl font-bold" style={{ background: p.color }}>{p.initial}</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><div className="font-semibold text-foreground">{p.name}</div></div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</div>
                <div className="mt-2 flex items-center justify-between"><span className="font-bold text-foreground">RM{p.price}</span><Badge variant={stockStatus.v}>{stockStatus.label}</Badge></div>
                <button className="mt-3 w-full h-8 rounded-md border border-border text-xs font-medium hover:bg-accent">View Details</button>
              </div>
            </div>
          );
        })}</div>
      </div>
    </div>
  );
}
