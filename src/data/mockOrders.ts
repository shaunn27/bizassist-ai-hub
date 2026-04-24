export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  items: string;
  total: number;
  source: "WhatsApp" | "Website" | "Phone";
  receivedAt: string;
  status: "Pending" | "Confirmed" | "Processing" | "Delivered";
  chatExcerpt?: string;
  timeline: { label: string; time: string; done: boolean }[];
};

export const mockOrders: Order[] = [
  {
    id: "ORD-0023",
    customerId: "c1",
    customerName: "Ah Kow",
    items: "2x Premium Chocolate",
    total: 30,
    source: "WhatsApp",
    receivedAt: "09:42 AM",
    status: "Pending",
    chatExcerpt:
      "boss i want order la, 2 box chocolate same as last time ah, urgent need by friday",
    timeline: [
      { label: "Created", time: "09:42 AM", done: true },
      { label: "Confirmed", time: "—", done: false },
      { label: "Processing", time: "—", done: false },
      { label: "Delivered", time: "—", done: false },
    ],
  },
  {
    id: "ORD-0024",
    customerId: "c2",
    customerName: "Siti Binti",
    items: "3x Strawberry Delight",
    total: 54,
    source: "WhatsApp",
    receivedAt: "09:29 AM",
    status: "Pending",
    chatExcerpt: "3 box strawberry hantar ke taman desa kl, this friday boleh?",
    timeline: [
      { label: "Created", time: "09:29 AM", done: true },
      { label: "Confirmed", time: "—", done: false },
      { label: "Processing", time: "—", done: false },
      { label: "Delivered", time: "—", done: false },
    ],
  },
  {
    id: "ORD-0025",
    customerId: "c5",
    customerName: "David Tan",
    items: "50x Monthly Subscription (quote)",
    total: 10000,
    source: "WhatsApp",
    receivedAt: "01:31 PM",
    status: "Pending",
    chatExcerpt: "I want 50 boxes monthly",
    timeline: [
      { label: "Created", time: "01:31 PM", done: true },
      { label: "Confirmed", time: "—", done: false },
      { label: "Processing", time: "—", done: false },
      { label: "Delivered", time: "—", done: false },
    ],
  },

  {
    id: "ORD-0020",
    customerId: "c4",
    customerName: "Nurul Hana",
    items: "5x Vanilla Cream",
    total: 75,
    source: "WhatsApp",
    receivedAt: "10:05 AM",
    status: "Confirmed",
    chatExcerpt: "5 kotak vanilla, hantar esok ke Subang Jaya",
    timeline: [
      { label: "Created", time: "10:00 AM", done: true },
      { label: "Confirmed", time: "10:05 AM", done: true },
      { label: "Processing", time: "—", done: false },
      { label: "Delivered", time: "—", done: false },
    ],
  },
  {
    id: "ORD-0022",
    customerId: "c6",
    customerName: "Priya Selva",
    items: "2x Mixed Bundle",
    total: 110,
    source: "WhatsApp",
    receivedAt: "Yesterday",
    status: "Confirmed",
    chatExcerpt: "2 mixed bundle as usual",
    timeline: [
      { label: "Created", time: "Yesterday", done: true },
      { label: "Confirmed", time: "Today 8:00 AM", done: true },
      { label: "Processing", time: "—", done: false },
      { label: "Delivered", time: "—", done: false },
    ],
  },

  {
    id: "ORD-0017",
    customerId: "c3",
    customerName: "Raj Kumar",
    items: "5x Mixed Bundle",
    total: 275,
    source: "WhatsApp",
    receivedAt: "2 days ago",
    status: "Processing",
    chatExcerpt: "5 mixed bundle for office",
    timeline: [
      { label: "Created", time: "2 days ago", done: true },
      { label: "Confirmed", time: "Yesterday", done: true },
      { label: "Processing", time: "Today 7:00 AM", done: true },
      { label: "Delivered", time: "—", done: false },
    ],
  },
  {
    id: "ORD-0018",
    customerId: "c5",
    customerName: "David Tan",
    items: "1x Corporate Gift Pack",
    total: 120,
    source: "WhatsApp",
    receivedAt: "3 days ago",
    status: "Processing",
    chatExcerpt: "trial corporate gift pack",
    timeline: [
      { label: "Created", time: "3 days ago", done: true },
      { label: "Confirmed", time: "2 days ago", done: true },
      { label: "Processing", time: "Today 9:30 AM", done: true },
      { label: "Delivered", time: "—", done: false },
    ],
  },

  {
    id: "ORD-0019",
    customerId: "c2",
    customerName: "Siti Binti",
    items: "3x Vanilla (refund)",
    total: 45,
    source: "WhatsApp",
    receivedAt: "Last week",
    status: "Delivered",
    chatExcerpt: "wrong product delivered — refund processed",
    timeline: [
      { label: "Created", time: "Last week", done: true },
      { label: "Confirmed", time: "Last week", done: true },
      { label: "Processing", time: "Last week", done: true },
      { label: "Delivered", time: "5 days ago", done: true },
    ],
  },
  {
    id: "ORD-0021",
    customerId: "c6",
    customerName: "Priya Selva",
    items: "2x Mixed Bundle",
    total: 110,
    source: "WhatsApp",
    receivedAt: "Last Tuesday",
    status: "Delivered",
    chatExcerpt: "regular monthly order",
    timeline: [
      { label: "Created", time: "Last Tuesday", done: true },
      { label: "Confirmed", time: "Last Tuesday", done: true },
      { label: "Processing", time: "Wednesday", done: true },
      { label: "Delivered", time: "Today", done: true },
    ],
  },
];
