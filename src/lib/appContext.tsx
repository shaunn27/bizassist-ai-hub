import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockChats, type ChatThread, type ChatMessage } from "@/data/mockChats";
import { mockOrders, type Order } from "@/data/mockOrders";
import { mockMeetings, type Meeting } from "@/data/mockMeetings";
import { listPersistedChats, upsertPersistedChat } from "@/lib/apiClient";
import {
  avatarColorFromSeed,
  makeCustomerId,
  makeInitials,
  type ParsedWhatsAppChat,
} from "@/utils/parseWhatsAppExport";

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
  model: "ilmu-glm-5.1",
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
  importWhatsAppChat: (parsed: ParsedWhatsAppChat) => Promise<{ customerId: string }>;

  // orders
  orders: Order[];
  createOrder: (input: {
    customerId: string;
    customerName: string;
    items: string;
    total: number;
    chatExcerpt?: string;
  }) => Order;
  updateOrderStatus: (id: string, status: Order["status"]) => void;

  // meetings
  meetings: Meeting[];
  createMeeting: (input: {
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    duration: string;
    purpose: string;
  }) => Meeting;
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

export const BUSINESS_LIST = ["Kedai Maju Enterprise", "Siti's Bakehouse", "RajTech Solutions"];

const BUSINESSES = BUSINESS_LIST;

function sortChats(chats: ChatThread[]): ChatThread[] {
  return [...chats].sort((a, b) => {
    const ta = a.messages[a.messages.length - 1]?.timestamp || 0;
    const tb = b.messages[b.messages.length - 1]?.timestamp || 0;
    return tb - ta;
  });
}

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
    {
      id: "n1",
      severity: "critical",
      text: "Ah Kow hasn't received a reply for 18 minutes",
      time: "11:03 AM",
      read: false,
      link: { type: "chat", id: "c1" },
    },
    {
      id: "n2",
      severity: "critical",
      text: "Raj Kumar shows cancellation intent",
      time: "02:50 PM",
      read: false,
      link: { type: "chat", id: "c3" },
    },
    {
      id: "n3",
      severity: "warning",
      text: "Siti Binti's order has missing delivery address",
      time: "09:30 AM",
      read: false,
      link: { type: "chat", id: "c2" },
    },
    {
      id: "n4",
      severity: "success",
      text: "Order #ORD-0019 marked as delivered",
      time: "5 days ago",
      read: true,
    },
    {
      id: "n5",
      severity: "info",
      text: "New message from David Tan",
      time: "01:47 PM",
      read: false,
      link: { type: "chat", id: "c5" },
    },
  ]);

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("ba_theme") as "light" | "dark" | null;
    if (t) setTheme(t);
    const s = localStorage.getItem("ba_settings");
    if (s) {
      try {
        const parsed = JSON.parse(s) as Partial<Settings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, apiKey: "" });
      } catch (err: unknown) {
        console.debug("Failed to parse stored settings:", err);
      }
    }
    const b = localStorage.getItem("ba_business");
    if (b) setBusiness(b);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ba_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ba_business", business);
  }, [business]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ba_settings",
        JSON.stringify({ ...settings, apiKey: "" } satisfies Settings),
      );
    }
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    const loadPersistedChats = async () => {
      try {
        const result = await listPersistedChats();
        if (cancelled || !result.chats.length) return;

        setChats((prev) => {
          const map = new Map(prev.map((c) => [c.customerId, c]));
          for (const chat of result.chats) {
            map.set(chat.customerId, { ...chat, source: chat.source || "supabase" });
          }
          return sortChats(Array.from(map.values()));
        });

        if (!activeChatId) {
          setActiveChatId(result.chats[0]?.customerId || null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.debug("Supabase load skipped:", msg);
      }
    };

    void loadPersistedChats();

    return () => {
      cancelled = true;
    };
    // intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const createOrder = (input: {
    customerId: string;
    customerName: string;
    items: string;
    total: number;
    chatExcerpt?: string;
  }) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const order: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      customerId: input.customerId,
      customerName: input.customerName,
      items: input.items,
      total: input.total,
      source: "WhatsApp",
      receivedAt: time,
      status: "Pending",
      chatExcerpt: input.chatExcerpt,
      timeline: [
        { label: "Created", time, done: true },
        { label: "Confirmed", time: "—", done: false },
        { label: "Processing", time: "—", done: false },
        { label: "Delivered", time: "—", done: false },
      ],
    };

    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const createMeeting = (input: {
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    duration: string;
    purpose: string;
  }) => {
    const meeting: Meeting = {
      id: `MT-${Date.now().toString().slice(-6)}`,
      customerId: input.customerId,
      customerName: input.customerName,
      date: input.date,
      time: input.time,
      duration: input.duration,
      purpose: input.purpose,
      status: "Scheduled",
    };

    setMeetings((prev) => [meeting, ...prev]);
    return meeting;
  };

  const persistThread = (thread: ChatThread) => {
    void upsertPersistedChat(thread).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.debug("Failed to persist chat:", msg);
    });
  };

  const sendAgentMessage = (customerId: string, text: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const msg: ChatMessage = {
      id: `a${Date.now()}`,
      from: "agent",
      type: "text",
      text,
      time,
      timestamp: now.getTime(),
    };
    setChats((prev) => {
      const next = prev.map((c) =>
        c.customerId === customerId
          ? {
              ...c,
              messages: [...c.messages, msg],
              waitingMinutes: 0,
              lastMessagePreview: text,
            }
          : c,
      );
      const updated = next.find((c) => c.customerId === customerId);
      if (updated) persistThread(updated);
      return sortChats(next);
    });
  };

  const markChatRead = (customerId: string) => {
    setChats((prev) => {
      const next = prev.map((c) => (c.customerId === customerId ? { ...c, unread: 0 } : c));
      const updated = next.find((c) => c.customerId === customerId);
      if (updated) persistThread(updated);
      return next;
    });
  };

  const importWhatsAppChat = async (parsed: ParsedWhatsAppChat) => {
    const customerId = makeCustomerId(parsed.customerName);
    const initials = makeInitials(parsed.customerName);
    const avatarColor = avatarColorFromSeed(parsed.customerName);
    const last = parsed.messages[parsed.messages.length - 1];
    const now = Date.now();
    const waitingMinutes =
      last?.from === "customer" ? Math.max(0, Math.floor((now - last.timestamp) / 60000)) : 0;

    const thread: ChatThread = {
      customerId,
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      customerAvatarColor: avatarColor,
      customerInitials: initials,
      source: "whatsapp-import",
      flagged: waitingMinutes >= 15 ? "critical" : waitingMinutes >= 5 ? "warning" : null,
      unread: 0,
      status: "open",
      waitingMinutes,
      lastMessagePreview: last?.text || "Imported WhatsApp chat",
      messages: parsed.messages,
    };

    setChats((prev) => sortChats([thread, ...prev]));
    setActiveChatId(customerId);
    persistThread(thread);

    return { customerId };
  };

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const addNotification = (n: Omit<Notification, "id" | "time" | "read">) => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setNotifications((prev) => [{ id: `n${Date.now()}`, time, read: false, ...n }, ...prev]);
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const updateSettings = (s: Partial<Settings>) => setSettings((cur) => ({ ...cur, ...s }));

  const value = useMemo<AppCtx>(
    () => ({
      theme,
      toggleTheme,
      business,
      setBusiness,
      sidebarCollapsed,
      setSidebarCollapsed,
      chats,
      activeChatId,
      setActiveChatId,
      sendAgentMessage,
      markChatRead,
      importWhatsAppChat,
      orders,
      createOrder,
      updateOrderStatus,
      meetings,
      createMeeting,
      setMeetings,
      notifications,
      addNotification,
      markAllRead,
      settings,
      updateSettings,
    }),
    [
      theme,
      business,
      sidebarCollapsed,
      chats,
      activeChatId,
      orders,
      meetings,
      notifications,
      settings,
      createOrder,
      createMeeting,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
