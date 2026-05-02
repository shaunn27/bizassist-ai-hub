import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { mockCustomers } from "@/data/mockCustomers";
import { Badge } from "@/components/shared/Badge";
import { Modal, toast } from "@/components/shared/Toast";
import { ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cancelLocalMeeting } from "@/server/cancelItem.functions";

export function MeetingsPage() {
  const { meetings, orders, createMeeting, deleteMeeting } = useApp();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date().toISOString().split("T")[0]);

  const [addOpen, setAddOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [time, setTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("30 min");
  const [purpose, setPurpose] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  const dayMeetings = meetings.filter((m) => m.date === selected);

  const checkConflicts = (meetingId: string) => {
    const m = meetings.find((x) => x.id === meetingId)!;
    const sameDay = meetings.filter((x) => x.date === m.date && x.id !== m.id);
    const orderConflicts =
      orders.filter((o) => o.status === "Pending" || o.status === "Confirmed").length > 5 ? 1 : 0;
    if (sameDay.length === 0 && orderConflicts === 0) {
      toast("✓ No conflicts detected — safe to confirm", "success");
    } else {
      toast(`⚠ Conflict: ${sameDay.length} other meeting(s) on this day`, "error");
    }
  };

  const handleAddMeeting = () => {
    if (!customerName.trim()) {
      toast("Customer name is required.", "error");
      return;
    }
    const now = Date.now();
    createMeeting({
      customerId: `manual-${now}`,
      customerName: customerName.trim(),
      date: selected,
      time,
      duration,
      purpose,
    });
    setAddOpen(false);
    setCustomerName("");
    setPurpose("");
    toast("Meeting created", "success");
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-[1fr_360px] gap-5 max-w-[1400px] mx-auto">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg">{monthName}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-[11px] text-muted-foreground font-semibold text-center py-2"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const has = meetings.some((m) => m.date === dateStr);
              const isSel = dateStr === selected;
              return (
                <button
                  key={day}
                  onClick={() => setSelected(dateStr)}
                  className={cn(
                    "aspect-square rounded-md text-sm font-medium hover:bg-accent relative",
                    isSel
                      ? "bg-primary text-primary-foreground hover:bg-primary-dark"
                      : "text-foreground",
                  )}
                >
                  {day}
                  {has && (
                    <span
                      className={cn(
                        "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                        isSel ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Meetings on {selected}</h3>
            <button
              onClick={() => setAddOpen(true)}
              className="h-8 px-3 rounded-md bg-foreground text-background text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Meeting
            </button>
          </div>
          <div className="space-y-3">
            {dayMeetings.length === 0 && (
              <div className="text-sm text-muted-foreground p-6 text-center bg-card border border-border rounded-xl">
                No meetings scheduled
              </div>
            )}
            {dayMeetings.map((m) => {
              const cust = mockCustomers.find((c) => c.id === m.customerId);
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ background: cust?.avatarColor }}
                    >
                      {cust?.initials}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm">{m.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.time} · {m.duration}
                      </div>
                    </div>
                    <Badge
                      variant={
                        m.status === "Done"
                          ? "success"
                          : m.status === "Scheduled"
                            ? "primary"
                            : "warning"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{m.purpose}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => checkConflicts(m.id)}
                      className="flex-1 h-8 rounded-md border border-border text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="h-3 w-3" /> Check Conflicts
                    </button>
                    <button
                      onClick={() => toast("Meeting confirmed", "success")}
                      className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Cancel meeting for ${m.customerName}? This cannot be undone.`)) return;
                        const res = await cancelLocalMeeting({ data: { customerName: m.customerName, meetingId: m.id } });
                        if (res.ok) {
                          deleteMeeting(m.id);
                          toast("Meeting cancelled.", "success");
                        } else {
                          toast(res.error || "Failed to cancel meeting.", "error");
                        }
                      }}
                      className="h-8 px-2 rounded-md border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add Meeting for ${selected}`}
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)}
              className="h-9 px-3 rounded-md border border-border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMeeting}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm"
            >
              Create Meeting
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground col-span-2">
            Customer name
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Doe"
              className="mt-1 h-9 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Time
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 10:00 AM"
              className="mt-1 h-9 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Duration
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30 min"
              className="mt-1 h-9 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground col-span-2">
            Purpose
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Discuss new product"
              className="mt-1 h-9 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
