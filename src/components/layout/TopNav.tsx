import { useState, useRef, useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Search, Bell, Sun, Moon, Settings as SettingsIcon, AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/messages": "Messages",
  "/orders": "Orders",
  "/meetings": "Meetings",
  "/analytics": "Analytics",
  "/customers": "Customers",
  "/catalog": "Product Catalog",
  "/settings": "Settings",
};

export function TopNav() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggleTheme, notifications, markAllRead, setActiveChatId } = useApp();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const title = TITLES[path] || "BizAssist AI";

  const sevIcon = (s: string) => {
    if (s === "critical") return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (s === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
    if (s === "success") return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <Info className="h-4 w-4 text-primary" />;
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-5 gap-4 shrink-0">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-72 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center relative"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-96 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="font-semibold text-sm">Notifications</span>
                <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (n.link?.type === "chat") {
                        setActiveChatId(n.link.id);
                        router.navigate({ to: "/messages" });
                      } else if (n.link?.type === "order") {
                        router.navigate({ to: "/orders" });
                      }
                      setBellOpen(false);
                    }}
                    className={cn(
                      "w-full text-left flex gap-3 p-3 hover:bg-accent/60 border-b border-border transition-colors",
                      !n.read && "bg-primary-soft/40"
                    )}
                  >
                    <div className="mt-0.5">{sevIcon(n.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{n.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <button
          onClick={() => router.navigate({ to: "/settings" })}
          className="h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
          aria-label="Settings"
        >
          <SettingsIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
