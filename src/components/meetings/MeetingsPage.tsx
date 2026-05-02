import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { mockCustomers } from "@/data/mockCustomers";
import { Badge } from "@/components/shared/Badge";
import { toast } from "@/components/shared/Toast";
import { cancelLocalMeeting } from "@/server/cancelItem.functions";
import { ChevronLeft, ChevronRight, AlertTriangle, Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MeetingsPage() {
  const { meetings, orders, createMeeting, deleteMeeting } = useApp();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date().toISOString().split("T")[0]);
  const [showCreate, setShowCreate] = useState(false);

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
          <h3 className="font-semibold text-foreground mb-3">Meetings on {selected}</h3>
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
                      className="h-8 px-3 rounded-md border border-destructive/50 text-destructive text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive/5"
                    >
                      <Trash2 className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-full h-9 mt-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Create Meeting
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateMeetingModal
          defaultDate={selected}
          onClose={() => setShowCreate(false)}
          onCreate={(input) => {
            createMeeting(input);
            setShowCreate(false);
            toast("Meeting created successfully", "success");
          }}
        />
      )}
    </div>
  );
}

function CreateMeetingModal({ defaultDate, onClose, onCreate }: {
  defaultDate: string;
  onClose: () => void;
  onCreate: (input: { customerId: string; customerName: string; date: string; time: string; duration: string; purpose: string }) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("30 min");
  const [purpose, setPurpose] = useState("");

  return (
    <div className="fixed inset-0 z-[80] bg-foreground/40 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="w-[420px] bg-card border border-border rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-bold text-foreground">Create Meeting</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Customer Name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="e.g. David Tan" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Customer ID</label>
            <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="e.g. c5" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="YYYY-MM-DD" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Time</label>
              <input value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="e.g. 3:00 PM" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duration</label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="e.g. 30 min" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Purpose</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm mt-1" placeholder="e.g. Discuss bulk pricing" />
          </div>
          <button
            onClick={() => {
              if (!customerName || !purpose) { toast("Please fill required fields", "error"); return; }
              onCreate({ customerId: customerId || `cust-${Date.now().toString().slice(-4)}`, customerName, date, time, duration, purpose });
            }}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
          >
            Create Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
