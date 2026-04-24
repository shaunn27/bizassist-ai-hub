import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Download, FileText, X, Database, FileCheck2, Link2 } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { Badge } from "@/components/shared/Badge";
import { toast } from "@/components/shared/Toast";
import type { Order } from "@/data/mockOrders";
import { cn } from "@/lib/utils";

const COLS: { key: Order["status"]; color: string; label: string }[] = [
  { key: "Pending", color: "bg-warning", label: "Pending" },
  { key: "Confirmed", color: "bg-primary", label: "Confirmed" },
  { key: "Processing", color: "bg-purple-500", label: "Processing" },
  { key: "Delivered", color: "bg-success", label: "Delivered" },
];

export function OrdersPage() {
  const { orders, updateOrderStatus } = useApp();
  const [active, setActive] = useState<Order | null>(null);
  const totalToday = orders.reduce((s, o) => s + (o.status !== "Delivered" ? o.total : 0), 0);

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const id = r.draggableId;
    const newStatus = r.destination.droppableId as Order["status"];
    updateOrderStatus(id, newStatus);
    toast(`Order ${id} moved to ${newStatus}`, "success");
  };

  const exportCSV = () => {
    const csv = ["ID,Customer,Items,Total,Status,Received"]
      .concat(
        orders.map(
          (o) => `${o.id},${o.customerName},"${o.items}",${o.total},${o.status},${o.receivedAt}`,
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    toast("CSV exported", "success");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3">
        <select className="h-9 px-3 rounded-md border border-border bg-background text-sm">
          <option>All statuses</option>
        </select>
        <select className="h-9 px-3 rounded-md border border-border bg-background text-sm">
          <option>Today</option>
          <option>This week</option>
        </select>
        <input
          placeholder="Filter by customer..."
          className="h-9 px-3 rounded-md border border-border bg-background text-sm w-56"
        />
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Open revenue</div>
            <div className="text-lg font-bold text-foreground">RM{totalToday.toLocaleString()}</div>
          </div>
          <button
            onClick={exportCSV}
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

      <div className="flex-1 overflow-auto p-5">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4 min-w-[1100px]">
            {COLS.map((col) => {
              const items = orders.filter((o) => o.status === col.key);
              return (
                <Droppable key={col.key} droppableId={col.key}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.droppableProps}
                      className="bg-secondary/40 rounded-xl p-3 min-h-[400px]"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", col.color)} />
                          <span className="font-semibold text-sm text-foreground">{col.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((o, i) => (
                          <Draggable key={o.id} draggableId={o.id} index={i}>
                            {(p) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                onClick={() => setActive(o)}
                                className="bg-card border border-border rounded-lg p-3 hover:shadow-md cursor-pointer transition-shadow"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    #{o.id}
                                  </span>
                                  <Badge variant="primary">WhatsApp</Badge>
                                </div>
                                <div className="font-semibold text-sm text-foreground mt-1">
                                  {o.customerName}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {o.items}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="font-bold text-foreground">
                                    RM{o.total.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {o.receivedAt}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[80] bg-foreground/40 flex justify-end animate-fade-in"
          onClick={() => setActive(null)}
        >
          <div
            className="w-[460px] bg-card border-l border-border h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-muted-foreground">#{active.id}</div>
                <div className="font-bold text-foreground">{active.customerName}</div>
              </div>
              <button
                onClick={() => setActive(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-primary-soft border border-primary/30 rounded-md p-3">
                <div className="text-[10px] uppercase font-bold text-primary-dark dark:text-accent-foreground">
                  AI auto-extracted from chat
                </div>
                <p className="text-xs text-foreground italic mt-1">"{active.chatExcerpt}"</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Items</div>
                <div className="font-semibold text-foreground">{active.items}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total</div>
                <div className="text-2xl font-bold text-foreground">
                  RM{active.total.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Status timeline</div>
                <ol className="space-y-2">
                  {active.timeline.map((t, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full border-2",
                          t.done ? "bg-success border-success" : "border-border",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          t.done ? "text-foreground font-medium" : "text-muted-foreground",
                        )}
                      >
                        {t.label}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{t.time}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    updateOrderStatus(active.id, "Confirmed");
                    setActive(null);
                    toast("Marked as Confirmed", "success");
                  }}
                  className="h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Mark Confirmed
                </button>
                <button
                  onClick={() => {
                    updateOrderStatus(active.id, "Delivered");
                    setActive(null);
                    toast("Marked as Delivered", "success");
                  }}
                  className="h-9 rounded-md bg-success text-success-foreground text-sm font-semibold"
                >
                  Mark Delivered
                </button>
              </div>
              <button
                onClick={() => toast("Connected to business database — stock updated", "success")}
                className="w-full h-9 rounded-md border border-border text-sm flex items-center justify-center gap-1.5"
              >
                <Database className="h-3.5 w-3.5" /> Link to Inventory
              </button>
              <button
                onClick={() => toast("Quotation synced to main order system", "success")}
                className="w-full h-9 rounded-md border border-border text-sm flex items-center justify-center gap-1.5"
              >
                <FileCheck2 className="h-3.5 w-3.5" /> Generate Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
