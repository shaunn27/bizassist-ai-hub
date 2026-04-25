export type ChatMessage = {
  id: string;
  from: "customer" | "agent";
  type: "text" | "image" | "voice";
  text?: string;
  filename?: string;
  duration?: string;
  time: string; // "09:42 AM"
  timestamp: number; // ms epoch (today)
};

export type ChatThread = {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerAvatarColor?: string;
  customerInitials?: string;
  source?: "seed" | "whatsapp-import" | "supabase";
  flagged: "critical" | "warning" | "info" | null;
  unread: number;
  status: "open" | "resolved";
  // minutes since last customer message without agent reply (for SLA)
  waitingMinutes: number;
  lastMessagePreview: string;
  messages: ChatMessage[];
};

const today = new Date();
today.setHours(0, 0, 0, 0);
const t = (h: number, m: number) => today.getTime() + h * 3600000 + m * 60000;
const fmt = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export const mockChats: ChatThread[] = [
  {
    customerId: "c1",
    flagged: "critical",
    unread: 2,
    status: "open",
    waitingMinutes: 18,
    lastMessagePreview: "hello??",
    messages: [
      {
        id: "m1",
        from: "customer",
        type: "text",
        text: "boss i want order la",
        time: fmt(9, 42),
        timestamp: t(9, 42),
      },
      {
        id: "m2",
        from: "customer",
        type: "text",
        text: "2 box chocolate same as last time ah",
        time: fmt(9, 42),
        timestamp: t(9, 42),
      },
      {
        id: "m3",
        from: "customer",
        type: "text",
        text: "urgent need by friday",
        time: fmt(9, 43),
        timestamp: t(9, 43),
      },
      {
        id: "m4",
        from: "agent",
        type: "text",
        text: "ok noted",
        time: fmt(10, 1),
        timestamp: t(10, 1),
      },
      {
        id: "m5",
        from: "customer",
        type: "text",
        text: "eh confirm already or not",
        time: fmt(10, 45),
        timestamp: t(10, 45),
      },
      {
        id: "m6",
        from: "customer",
        type: "text",
        text: "my address same la dun need ask",
        time: fmt(10, 45),
        timestamp: t(10, 45),
      },
      {
        id: "m7",
        from: "customer",
        type: "voice",
        duration: "0:08",
        time: fmt(10, 46),
        timestamp: t(10, 46),
      },
      {
        id: "m8",
        from: "customer",
        type: "text",
        text: "hello??",
        time: fmt(11, 3),
        timestamp: t(11, 3),
      },
    ],
  },
  {
    customerId: "c2",
    flagged: "warning",
    unread: 1,
    status: "open",
    waitingMinutes: 6,
    lastMessagePreview: "hello? still waiting",
    messages: [
      {
        id: "n1",
        from: "customer",
        type: "text",
        text: "hi kak, last week order salah la",
        time: fmt(8, 55),
        timestamp: t(8, 55),
      },
      {
        id: "n2",
        from: "customer",
        type: "text",
        text: "i order strawberry but dapat vanilla",
        time: fmt(8, 56),
        timestamp: t(8, 56),
      },
      {
        id: "n3",
        from: "agent",
        type: "text",
        text: "so sorry kak, we will check and get back to you",
        time: fmt(9, 10),
        timestamp: t(9, 10),
      },
      {
        id: "n4",
        from: "customer",
        type: "text",
        text: "ok nvm. can order new one?",
        time: fmt(9, 28),
        timestamp: t(9, 28),
      },
      {
        id: "n5",
        from: "customer",
        type: "text",
        text: "3 box strawberry hantar ke taman desa kl",
        time: fmt(9, 29),
        timestamp: t(9, 29),
      },
      {
        id: "n6",
        from: "customer",
        type: "text",
        text: "this friday boleh?",
        time: fmt(9, 30),
        timestamp: t(9, 30),
      },
      {
        id: "n7",
        from: "customer",
        type: "image",
        filename: "receipt_last_order.jpg",
        time: fmt(9, 30),
        timestamp: t(9, 30),
      },
      {
        id: "n8",
        from: "customer",
        type: "text",
        text: "hello? still waiting",
        time: fmt(11, 0),
        timestamp: t(11, 0),
      },
    ],
  },
  {
    customerId: "c3",
    flagged: "critical",
    unread: 3,
    status: "open",
    waitingMinutes: 22,
    lastMessagePreview: "hello? i go other place already la if no reply",
    messages: [
      {
        id: "r1",
        from: "customer",
        type: "text",
        text: "hi how much for 10 box?",
        time: fmt(14, 5),
        timestamp: t(14, 5),
      },
      {
        id: "r2",
        from: "customer",
        type: "text",
        text: "if too expensive i just buy elsewhere la",
        time: fmt(14, 6),
        timestamp: t(14, 6),
      },
      {
        id: "r3",
        from: "agent",
        type: "text",
        text: "hi! RM15 per box, so RM150 for 10",
        time: fmt(14, 25),
        timestamp: t(14, 25),
      },
      {
        id: "r4",
        from: "customer",
        type: "text",
        text: "wah expensive. can discount anot?",
        time: fmt(14, 26),
        timestamp: t(14, 26),
      },
      {
        id: "r5",
        from: "customer",
        type: "text",
        text: "i always buy from u all one",
        time: fmt(14, 26),
        timestamp: t(14, 26),
      },
      {
        id: "r6",
        from: "customer",
        type: "text",
        text: "hello? i go other place already la if no reply",
        time: fmt(14, 50),
        timestamp: t(14, 50),
      },
    ],
  },
  {
    customerId: "c4",
    flagged: null,
    unread: 0,
    status: "resolved",
    waitingMinutes: 0,
    lastMessagePreview: "ok terima kasih!",
    messages: [
      {
        id: "u1",
        from: "customer",
        type: "text",
        text: "hi, nak order 5 kotak vanilla",
        time: fmt(10, 0),
        timestamp: t(10, 0),
      },
      {
        id: "u2",
        from: "customer",
        type: "text",
        text: "hantar ke Subang Jaya, alamat no 12 Jln SS15/4",
        time: fmt(10, 1),
        timestamp: t(10, 1),
      },
      {
        id: "u3",
        from: "customer",
        type: "text",
        text: "boleh esok?",
        time: fmt(10, 2),
        timestamp: t(10, 2),
      },
      {
        id: "u4",
        from: "agent",
        type: "text",
        text: "boleh kak! confirm 5 kotak vanilla, hantar esok ke Subang Jaya. Total RM75. Kami proses sekarang!",
        time: fmt(10, 5),
        timestamp: t(10, 5),
      },
      {
        id: "u5",
        from: "customer",
        type: "text",
        text: "ok terima kasih!",
        time: fmt(10, 6),
        timestamp: t(10, 6),
      },
    ],
  },
  {
    customerId: "c5",
    flagged: null,
    unread: 1,
    status: "open",
    waitingMinutes: 3,
    lastMessagePreview: "also can send me the product catalog?",
    messages: [
      {
        id: "d1",
        from: "customer",
        type: "text",
        text: "hey, can we meet to discuss bulk order?",
        time: fmt(13, 30),
        timestamp: t(13, 30),
      },
      {
        id: "d2",
        from: "customer",
        type: "text",
        text: "maybe this week? I want 50 boxes monthly",
        time: fmt(13, 31),
        timestamp: t(13, 31),
      },
      {
        id: "d3",
        from: "agent",
        type: "text",
        text: "sure! what day works for you?",
        time: fmt(13, 45),
        timestamp: t(13, 45),
      },
      {
        id: "d4",
        from: "customer",
        type: "text",
        text: "friday afternoon? around 3pm?",
        time: fmt(13, 46),
        timestamp: t(13, 46),
      },
      {
        id: "d5",
        from: "customer",
        type: "text",
        text: "also can send me the product catalog?",
        time: fmt(13, 47),
        timestamp: t(13, 47),
      },
    ],
  },
  {
    customerId: "c6",
    flagged: null,
    unread: 0,
    status: "resolved",
    waitingMinutes: 0,
    lastMessagePreview: "ok thanks for checking",
    messages: [
      {
        id: "p1",
        from: "customer",
        type: "text",
        text: "my order from last tuesday hasn't arrived",
        time: fmt(9, 0),
        timestamp: t(9, 0),
      },
      {
        id: "p2",
        from: "agent",
        type: "text",
        text: "so sorry! Let me check with logistics now",
        time: fmt(9, 15),
        timestamp: t(9, 15),
      },
      {
        id: "p3",
        from: "agent",
        type: "text",
        text: "confirmed — your order will arrive today by 5pm",
        time: fmt(9, 30),
        timestamp: t(9, 30),
      },
      {
        id: "p4",
        from: "customer",
        type: "text",
        text: "ok thanks for checking",
        time: fmt(9, 31),
        timestamp: t(9, 31),
      },
    ],
  },
];
