import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockChats, type ChatThread, type ChatMessage } from "@/data/mockChats";
import { mockOrders, type Order } from "@/data/mockOrders";
import { mockMeetings, type Meeting } from "@/data/mockMeetings";

export type Notification = {
  id: string;
  severity: "critical" | "warning" | "success" | "info";
  text: string;
  time: string;
  read: boolean;
  link?: { type: "chat" | "order"; id: string };
};

export type Settings = {
  apiKey: string;
  model: string;
  soundOnNewMessage: boolean;
  sla5: boolean;
  sla15: boolean;
  autoAnalyze: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-sonnet-4-20250514",
  soundOnNewMessage: true,
  sla5: true,
  sla15: true,
  autoAnalyze: true,
};

type AppCtx = {
  // theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // business
  business: string;
  setBusiness: (b: string) => void;

  // sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (b: boolean) => void;

  // chats
  chats: ChatThread[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  sendAgentMessage: (customerId: string, text: string) => void;
  markChatRead: (customerId: string) => void;

  // orders
  orders: Order[];
  updateOrderStatus: (id: string, status: Order["status"]) => void;

  // meetings
  meetings: Meeting[];
  setMeetings: (m: Meeting[]) => void;

  // notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  markAllRead: () => void;

  // settings
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
};

const Ctx = createContext<AppCtx | null>(null);

const BUSINESSES = ["Kedai Maju Enterprise", "Siti's Bakehouse", "RajTech Solutions"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [business, setBusiness] = useState(BUSINESSES[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatThread[]>(mockChats);
  const [activeChatId, setActiveChatId] = useState<string | null>("c1");
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "n1", severity: "critical", text: "Ah Kow hasn't received a reply for 18 minutes", time: "11:03 AM", read: false, link: { type: "chat", id: "c1" } },
    { id: "n2", severity: "critical", text: "Raj Kumar shows cancellation intent", time: "02:50 PM", read: false, link: { type: "chat", id: "c3" } },
    { id: "n3", severity: "warning", text: "Siti Binti's order has missing delivery address", time: "09:30 AM", read: false, link: { type: "chat", id: "c2" } },
    { id: "n4", severity: "success", text: "Order #ORD-0019 marked as delivered", time: "5 days ago", read: true },
    { id: "n5", severity: "info", text: "New message from David Tan", time: "01:47 PM", read: false, link: { type: "chat", id: "c5" } },
  ]);

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("ba_theme") as "light" | "dark" | null;
    if (t) setTheme(t);
    const s = localStorage.getItem("ba_settings");
    if (s) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) }); } catch {}
    }
    const b = localStorage.getItem("ba_business");
    if (b) setBusiness(b);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ba_theme", theme);
  }, [theme]);

  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ba_business", business); }, [business]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("ba_settings", JSON.stringify(settings)); }, [settings]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const sendAgentMessage = (customerId: string, text: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const msg: ChatMessage = { id: `a${Date.now()}`, from: "agent", type: "text", text, time, timestamp: now.getTime() };
    setChats((prev) => prev.map((c) => c.customerId === customerId
      ? { ...c, messages: [...c.messages, msg], waitingMinutes: 0, lastMessagePreview: text }
      : c));
  };

  const markChatRead = (customerId: string) => {
    setChats((prev) => prev.map((c) => c.customerId === customerId ? { ...c, unread: 0 } : c));
  };

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  const addNotification = (n: Omit<Notification, "id" | "time" | "read">) => {
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    setNotifications((prev) => [{ id: `n${Date.now()}`, time, read: false, ...n }, ...prev]);
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const updateSettings = (s: Partial<Settings>) => setSettings((cur) => ({ ...cur, ...s }));

  const value = useMemo<AppCtx>(() => ({
    theme, toggleTheme, business, setBusiness, sidebarCollapsed, setSidebarCollapsed,
    chats, activeChatId, setActiveChatId, sendAgentMessage, markChatRead,
    orders, updateOrderStatus, meetings, setMeetings,
    notifications, addNotification, markAllRead,
    settings, updateSettings,
  }), [theme, business, sidebarCollapsed, chats, activeChatId, orders, meetings, notifications, settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}

export const BUSINESS_LIST = BUSINESSES;
