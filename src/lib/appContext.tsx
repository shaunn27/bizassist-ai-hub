import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChatThread, ChatMessage } from "@/data/mockChats";
import type { Order } from "@/data/mockOrders";
import { mockOrders } from "@/data/mockOrders";
import type { Meeting } from "@/data/mockMeetings";
import { mockMeetings } from "@/data/mockMeetings";
import type { Customer } from "@/data/mockCustomers";
import { mockCustomers } from "@/data/mockCustomers";
import type { Product } from "@/data/mockProducts";
import { mockProducts } from "@/data/mockProducts";
import { BUSINESS_DATA, BUSINESS_LIST } from "@/data/mockBusinessSets";
import {
  listPersistedChats,
  listCustomers,
  listMeetings,
  listOrders,
  listProducts,
  updateMeetingStatus as persistMeetingStatus,
  updateOrderStatus as persistOrderStatus,
  upsertPersistedChat,
} from "@/lib/apiClient";
import { simulateCustomerReply } from "@/server/customerSimulator";
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
  model: "gemini-2.5-flash",
  soundOnNewMessage: true,
  sla5: true,
  sla15: true,
  autoAnalyze: true,
};

const DEFAULT_NOTIFICATIONS: Notification[] = [
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
];

const BUSINESS_NOTIFICATIONS: Record<string, Notification[]> = {
  "Kedai Maju Enterprise": DEFAULT_NOTIFICATIONS,
  "Siti's Bakehouse": [
    {
      id: "bk-n1",
      severity: "warning",
      text: "Banquet invoice pending - Lakeside Hotels",
      time: "09:20 AM",
      read: false,
      link: { type: "chat", id: "bk-2" },
    },
  ],
  "RajTech Solutions": [
    {
      id: "rt-n1",
      severity: "critical",
      text: "Router lead time requested - Orchid Bank",
      time: "09:25 AM",
      read: false,
      link: { type: "chat", id: "rt-1" },
    },
  ],
  "EverPack Materials Co.": [
    {
      id: "ep-n1",
      severity: "warning",
      text: "Proof approval needed - Lumen Cosmetics Manufacturing",
      time: "10:05 AM",
      read: false,
      link: { type: "chat", id: "ep-2" },
    },
  ],
  "ApexBuild Supply Group": [
    {
      id: "ab-n1",
      severity: "warning",
      text: "Rebar delivery window pending - Metroline Infrastructure",
      time: "10:18 AM",
      read: false,
      link: { type: "chat", id: "ab-2" },
    },
  ],
  "HarborFoods Wholesale": [
    {
      id: "hf-n1",
      severity: "warning",
      text: "Seafood delivery reschedule - OceanView Hotels",
      time: "09:32 AM",
      read: false,
      link: { type: "chat", id: "hf-1" },
    },
  ],
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
  addCustomerMessage: (customerId: string, text: string) => void;
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
  updateOrderStatus: (
    id: string,
    status: Order["status"],
  ) => Promise<{ configured: boolean; ok: boolean }>;

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
  updateMeetingStatus: (
    id: string,
    status: Meeting["status"],
  ) => Promise<{ configured: boolean; ok: boolean }>;
  setMeetings: (m: Meeting[]) => void;

  // notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  markAllRead: () => void;

  // settings
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;

  // customers
  customers: Customer[];

  // products
  products: Product[];

  // typing state
  isTyping: Record<string, boolean>;
};

const Ctx = createContext<AppCtx | null>(null);

export { BUSINESS_LIST };

const DEFAULT_BUSINESS = BUSINESS_LIST[0] || "Kedai Maju Enterprise";
const BUSINESSES = BUSINESS_LIST;

const ORDER_STATUS_FLOW: Order["status"][] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Delivered",
];

function cloneSeed<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBusinessSeed(name: string) {
  return BUSINESS_DATA[name] || BUSINESS_DATA[DEFAULT_BUSINESS];
}

function getBusinessNotifications(name: string) {
  return BUSINESS_NOTIFICATIONS[name] || BUSINESS_NOTIFICATIONS[DEFAULT_BUSINESS] || [];
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function updateOrderTimeline(timeline: Order["timeline"], status: Order["status"]) {
  const statusIndex = ORDER_STATUS_FLOW.indexOf(status);
  const now = formatTime(new Date());
  return timeline.map((step, idx) => {
    const done = idx === 0 ? true : statusIndex >= idx;
    if (!done) return { ...step, done: false, time: "—" };
    const time = step.time && step.time !== "—" ? step.time : now;
    return { ...step, done: true, time };
  });
}

function sortChats(chats: ChatThread[]): ChatThread[] {
  return [...chats].sort((a, b) => {
    const ta = a.messages[a.messages.length - 1]?.timestamp || 0;
    const tb = b.messages[b.messages.length - 1]?.timestamp || 0;
    return tb - ta;
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initialSeed = getBusinessSeed(DEFAULT_BUSINESS);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [business, setBusiness] = useState(DEFAULT_BUSINESS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatThread[]>(cloneSeed(initialSeed.chats));
  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialSeed.chats[0]?.customerId ?? null,
  );
  const [orders, setOrders] = useState<Order[]>(cloneSeed(initialSeed.orders));
  const [meetings, setMeetings] = useState<Meeting[]>(cloneSeed(initialSeed.meetings));
  const [customers, setCustomers] = useState<Customer[]>(cloneSeed(initialSeed.customers));
  const [products, setProducts] = useState<Product[]>(cloneSeed(initialSeed.products));
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>(
    cloneSeed(getBusinessNotifications(DEFAULT_BUSINESS)),
  );
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

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
    if (b && BUSINESS_DATA[b]) setBusiness(b);
  }, []);

  useEffect(() => {
    const seed = getBusinessSeed(business);
    setChats(cloneSeed(seed.chats));
    setOrders(cloneSeed(seed.orders));
    setMeetings(cloneSeed(seed.meetings));
    setCustomers(cloneSeed(seed.customers));
    setProducts(cloneSeed(seed.products));
    setActiveChatId(seed.chats[0]?.customerId ?? null);
    setNotifications(cloneSeed(getBusinessNotifications(business)));
  }, [business]);

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
    if (business !== DEFAULT_BUSINESS) return;
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
  }, [business]);

  useEffect(() => {
    if (business !== DEFAULT_BUSINESS) return;
    let cancelled = false;

    const loadLists = async () => {
      try {
        const [ordersResult, meetingsResult, customersResult, productsResult] = await Promise.all([
          listOrders(),
          listMeetings(),
          listCustomers(),
          listProducts(),
        ]);

        if (cancelled) return;

        if (ordersResult?.configured && Array.isArray(ordersResult.orders)) {
          setOrders(ordersResult.orders.length ? (ordersResult.orders as Order[]) : mockOrders);
        }

        if (meetingsResult?.configured && Array.isArray(meetingsResult.meetings)) {
          setMeetings(
            meetingsResult.meetings.length ? (meetingsResult.meetings as Meeting[]) : mockMeetings,
          );
        }

        if (customersResult?.configured && Array.isArray(customersResult.customers)) {
          setCustomers(
            customersResult.customers.length
              ? (customersResult.customers as Customer[])
              : mockCustomers,
          );
        }

        if (productsResult?.configured && Array.isArray(productsResult.products)) {
          setProducts(
            productsResult.products.length
              ? (productsResult.products as Product[])
              : mockProducts,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.debug("List loading skipped:", msg);
      }
    };

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, [business]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const createOrder = (input: {
    id?: string;
    customerId: string;
    customerName: string;
    items: string;
    total: number;
    chatExcerpt?: string;
    receivedAt?: string;
    status?: Order["status"];
    source?: Order["source"];
  }) => {
    const now = new Date();
    const time = input.receivedAt || now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const status = input.status || "Pending";
    const statusOrder: Order["status"][] = ["Pending", "Confirmed", "Processing", "Delivered"];
    const statusIndex = statusOrder.indexOf(status);
    const doneAt = (idx: number) => (statusIndex >= idx ? time : "—");

    const order: Order = {
      id: input.id || `ORD-${Date.now().toString().slice(-6)}`,
      customerId: input.customerId,
      customerName: input.customerName,
      items: input.items,
      total: input.total,
      source: input.source || "WhatsApp",
      receivedAt: time,
      status,
      chatExcerpt: input.chatExcerpt,
      timeline: [
        { label: "Created", time, done: true },
        { label: "Confirmed", time: doneAt(1), done: statusIndex >= 1 },
        { label: "Processing", time: doneAt(2), done: statusIndex >= 2 },
        { label: "Delivered", time: doneAt(3), done: statusIndex >= 3 },
      ],
    };

    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const createMeeting = (input: {
    id?: string;
    customerId: string;
    customerName: string;
    date: string;
    time: string;
    duration: string;
    purpose: string;
    status?: Meeting["status"];
  }) => {
    const meeting: Meeting = {
      id: input.id || `MT-${Date.now().toString().slice(-6)}`,
      customerId: input.customerId,
      customerName: input.customerName,
      date: input.date,
      time: input.time,
      duration: input.duration,
      purpose: input.purpose,
      status: input.status || "Scheduled",
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

    // ── Trigger AI customer simulation after a short delay ──
    setTimeout(() => {
      setChats((currentChats) => {
        const thread = currentChats.find((c) => c.customerId === customerId);
        if (!thread) return currentChats;

        const customer = customers.find((cu) => cu.id === customerId);
        const productCatalog = products
          .map(
            (p) =>
              `${p.name} (${p.sku}) RM${p.price} — stock ${
                p.stock === -1 ? "unlimited" : p.stock
              }`,
          )
          .join("; ");

        // Set typing status
        setIsTyping((prev) => ({ ...prev, [customerId]: true }));

        // Fire off the simulation API call
        void simulateCustomerReply({
          data: {
            customerId,
            customerName: customer?.name || thread.customerName || "Customer",
            messages: thread.messages,
            productCatalog,
          },
        })
          .then((result) => {
            setIsTyping((prev) => ({ ...prev, [customerId]: false }));
            if (result.skipped || !result.reply) return;

            const replyNow = new Date();
            const replyTime = replyNow.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
            const customerMsg: ChatMessage = {
              id: `sim${Date.now()}`,
              from: "customer",
              type: "text",
              text: result.reply,
              time: replyTime,
              timestamp: replyNow.getTime(),
            };

            setChats((prev2) => {
              const next2 = prev2.map((c) =>
                c.customerId === customerId
                  ? {
                      ...c,
                      messages: [...c.messages, customerMsg],
                      unread: c.unread + 1,
                      lastMessagePreview: result.reply,
                      waitingMinutes: 1,
                    }
                  : c,
              );
              const updatedThread = next2.find(
                (c) => c.customerId === customerId,
              );
              if (updatedThread) persistThread(updatedThread);
              return sortChats(next2);
            });

            // Add notification for the new customer message
            const custName =
              customer?.name || thread.customerName || "Customer";
            addNotification({
              severity: "info",
              text: `New message from ${custName}`,
              link: { type: "chat", id: customerId },
            });
          })
          .catch((err: unknown) => {
            setIsTyping((prev) => ({ ...prev, [customerId]: false }));
            const errMsg =
              err instanceof Error ? err.message : String(err);
            console.warn("[CustomerSimulator] Failed:", errMsg);
          });

        return currentChats; // Return unchanged — actual update happens in .then()
      });
    }, 1500);
  };

  const addCustomerMessage = (customerId: string, text: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const msg: ChatMessage = {
      id: `c${Date.now()}`,
      from: "customer",
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
              unread: c.unread + 1,
              lastMessagePreview: text,
              waitingMinutes: 1, // trigger some waiting state
              flagged: "warning", // flag for attention in simulation
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

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    let previous: Order | null = null;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        previous = o;
        return { ...o, status, timeline: updateOrderTimeline(o.timeline, status) };
      }),
    );

    try {
      const result = await persistOrderStatus({ orderId: id, status });
      if (!result.configured) return { configured: false, ok: true };
      if (!result.ok) throw new Error("Order status update failed.");
      return { configured: true, ok: true };
    } catch (err) {
      if (previous) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, status: previous!.status, timeline: previous!.timeline } : o,
          ),
        );
      }
      throw err;
    }
  };

  const updateMeetingStatus = async (id: string, status: Meeting["status"]) => {
    let previous: Meeting | null = null;

    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        previous = m;
        return { ...m, status };
      }),
    );

    try {
      const result = await persistMeetingStatus({ meetingId: id, status });
      if (!result.configured) return { configured: false, ok: true };
      if (!result.ok) throw new Error("Meeting status update failed.");
      return { configured: true, ok: true };
    } catch (err) {
      if (previous) {
        setMeetings((prev) => prev.map((m) => (m.id === id ? previous! : m)));
      }
      throw err;
    }
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
      addCustomerMessage,
      markChatRead,
      importWhatsAppChat,
      orders,
      createOrder,
      updateOrderStatus,
      meetings,
      createMeeting,
      updateMeetingStatus,
      setMeetings,
      notifications,
      addNotification,
      markAllRead,
      settings,
      updateSettings,
      customers,
      products,
      isTyping,
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
      updateOrderStatus,
      createMeeting,
      updateMeetingStatus,
      customers,
      products,
      isTyping,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
