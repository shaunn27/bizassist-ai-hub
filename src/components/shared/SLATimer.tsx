import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SLATimer({ baseMinutes, compact = false }: { baseMinutes: number; compact?: boolean }) {
  // baseMinutes is "minutes already waited" when component mounts; we tick every second
  const [seconds, setSeconds] = useState(baseMinutes * 60);
  useEffect(() => {
    setSeconds(baseMinutes * 60);
    if (baseMinutes <= 0) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [baseMinutes]);

  if (baseMinutes <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const color = m >= 15 ? "text-destructive" : m >= 5 ? "text-warning" : "text-success";
  const bg = m >= 15 ? "bg-destructive/10" : m >= 5 ? "bg-warning/10" : "bg-success/10";

  if (compact) {
    return <span className={cn("text-[10px] font-semibold", color)}>waiting {m}m {s.toString().padStart(2, "0")}s</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-colors", color, bg)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      SLA {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}
