import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  MessageCircle,
  Package,
  Calendar,
  BarChart3,
  Users,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useApp, BUSINESS_LIST } from "@/lib/appContext";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "messages" | "orders";
};

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home, exact: true },
  { to: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  { to: "/orders", label: "Orders", icon: Package, badge: "orders" },
  { to: "/meetings", label: "Meetings", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/catalog", label: "Catalog", icon: Tag },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, chats, orders, business, setBusiness } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 shrink-0",
        sidebarCollapsed ? "w-[68px]" : "w-[220px]",
      )}
    >
      <div
        className={cn(
          "h-14 flex items-center border-b border-sidebar-border px-3 gap-2",
          sidebarCollapsed && "justify-center px-0",
        )}
      >
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          B
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-sidebar-foreground">
            BizAssist <span className="text-primary">AI</span>
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const badge =
            item.badge === "messages" ? totalUnread : item.badge === "orders" ? pendingOrders : 0;
          return (
            <Link
              key={item.to}
              // @ts-expect-error - dynamic route paths
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors group relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                sidebarCollapsed && "justify-center px-2",
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
              {badge > 0 && (
                <span
                  className={cn(
                    "rounded-full bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 flex items-center justify-center",
                    sidebarCollapsed && "absolute -top-0.5 -right-0.5",
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-2">
        {!sidebarCollapsed ? (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">
              Business
            </label>
            <select
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className="w-full mt-1 bg-card border border-border rounded-md px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {BUSINESS_LIST.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex justify-center" title={business}>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-2 bg-card/50",
            sidebarCollapsed && "justify-center",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            SL
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">
                Sarah Lim
              </div>
              <div className="text-[10px] text-muted-foreground">Senior Agent</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
