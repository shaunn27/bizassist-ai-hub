export type Customer = {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
  initials: string;
  loyalSince: string;
  totalOrders: number;
  totalSpent: number;
  lastActive: string;
  status: "Active" | "Inactive";
  preferredProducts: string[];
  avgOrderValue: number;
  behaviorSummary: string;
  orderHistory: { id: string; date: string; items: string; amount: number; status: string }[];
  lastConversationExcerpt: string;
};

export const mockCustomers: Customer[] = [
  {
    id: "c1", name: "Ah Kow", phone: "+60 12-345 6789",
    avatarColor: "#dc2626", initials: "AK",
    loyalSince: "Jan 2023", totalOrders: 14, totalSpent: 980,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Premium Chocolate Box", "Mixed Flavour Bundle"],
    avgOrderValue: 70,
    behaviorSummary: "Ah Kow is a high-volume repeat buyer, typically orders chocolate products on Fridays. Often writes in Manglish, expects fast turnaround. Prone to ambiguous references like 'same as last time' — confirm details every time.",
    orderHistory: [
      { id: "ORD-0014", date: "Last week", items: "2x Chocolate", amount: 30, status: "Delivered" },
      { id: "ORD-0010", date: "2 weeks ago", items: "3x Mixed Bundle", amount: 165, status: "Delivered" },
      { id: "ORD-0007", date: "Last month", items: "2x Chocolate", amount: 30, status: "Delivered" },
      { id: "ORD-0004", date: "Last month", items: "1x Corporate Gift Pack", amount: 120, status: "Delivered" },
      { id: "ORD-0001", date: "Jan 2023", items: "5x Chocolate", amount: 75, status: "Delivered" },
    ],
    lastConversationExcerpt: "boss i want order la, 2 box chocolate same as last time ah",
  },
  {
    id: "c2", name: "Siti Binti", phone: "+60 13-678 1234",
    avatarColor: "#f59e0b", initials: "SB",
    loyalSince: "Mar 2023", totalOrders: 22, totalSpent: 1540,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Strawberry Delight Box"],
    avgOrderValue: 70,
    behaviorSummary: "Siti is a loyal customer who orders weekly, prefers strawberry products, typically orders on Monday mornings. Has had 1 complaint (resolved). High retention risk if response time exceeds 30 min.",
    orderHistory: [
      { id: "ORD-0019", date: "Last week", items: "3x Vanilla (wrong)", amount: 45, status: "Refunded" },
      { id: "ORD-0015", date: "2 weeks ago", items: "3x Strawberry", amount: 54, status: "Delivered" },
      { id: "ORD-0011", date: "3 weeks ago", items: "3x Strawberry", amount: 54, status: "Delivered" },
      { id: "ORD-0008", date: "Last month", items: "2x Strawberry", amount: 36, status: "Delivered" },
      { id: "ORD-0005", date: "Last month", items: "4x Strawberry", amount: 72, status: "Delivered" },
    ],
    lastConversationExcerpt: "hi kak, last week order salah la",
  },
  {
    id: "c3", name: "Raj Kumar", phone: "+60 16-998 7766",
    avatarColor: "#8b5cf6", initials: "RK",
    loyalSince: "Aug 2023", totalOrders: 8, totalSpent: 720,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Mixed Flavour Bundle"],
    avgOrderValue: 90,
    behaviorSummary: "Raj is a price-sensitive bulk buyer. Often compares with competitors and asks for discounts. High cancellation risk if not responded within 30 min — he openly threatens to buy elsewhere.",
    orderHistory: [
      { id: "ORD-0017", date: "2 weeks ago", items: "5x Mixed Bundle", amount: 275, status: "Delivered" },
      { id: "ORD-0013", date: "Last month", items: "8x Chocolate", amount: 120, status: "Delivered" },
      { id: "ORD-0009", date: "2 months ago", items: "10x Chocolate", amount: 150, status: "Delivered" },
    ],
    lastConversationExcerpt: "hi how much for 10 box?",
  },
  {
    id: "c4", name: "Nurul Hana", phone: "+60 11-222 3344",
    avatarColor: "#10b981", initials: "NH",
    loyalSince: "Jun 2024", totalOrders: 5, totalSpent: 280,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Vanilla Cream Box"],
    avgOrderValue: 56,
    behaviorSummary: "Nurul is a clean, orderly customer. Provides full details upfront, polite, never disputes. Easiest customer to serve — flag for VIP.",
    orderHistory: [
      { id: "ORD-0020", date: "Today", items: "5x Vanilla", amount: 75, status: "Confirmed" },
      { id: "ORD-0016", date: "Last week", items: "3x Vanilla", amount: 45, status: "Delivered" },
      { id: "ORD-0012", date: "2 weeks ago", items: "4x Vanilla", amount: 60, status: "Delivered" },
    ],
    lastConversationExcerpt: "ok terima kasih!",
  },
  {
    id: "c5", name: "David Tan", phone: "+60 19-555 8899",
    avatarColor: "#2563eb", initials: "DT",
    loyalSince: "Feb 2024", totalOrders: 3, totalSpent: 540,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Corporate Gift Pack", "Monthly Subscription Box"],
    avgOrderValue: 180,
    behaviorSummary: "David is a B2B prospect interested in bulk monthly orders. Currently in discovery phase — handle with white-glove service. High lifetime value potential.",
    orderHistory: [
      { id: "ORD-0018", date: "Last month", items: "1x Corporate Gift", amount: 120, status: "Delivered" },
      { id: "ORD-0006", date: "2 months ago", items: "1x Subscription Box", amount: 200, status: "Delivered" },
    ],
    lastConversationExcerpt: "hey, can we meet to discuss bulk order?",
  },
  {
    id: "c6", name: "Priya Selva", phone: "+60 17-444 1122",
    avatarColor: "#ec4899", initials: "PS",
    loyalSince: "Nov 2023", totalOrders: 11, totalSpent: 825,
    lastActive: "Today", status: "Active",
    preferredProducts: ["Mixed Flavour Bundle"],
    avgOrderValue: 75,
    behaviorSummary: "Priya is a steady monthly buyer. Polite, patient when explained clearly. Recent delivery delay handled — customer satisfied.",
    orderHistory: [
      { id: "ORD-0021", date: "Last Tuesday", items: "2x Mixed Bundle", amount: 110, status: "Delivered" },
      { id: "ORD-0003", date: "Last month", items: "3x Chocolate", amount: 45, status: "Delivered" },
    ],
    lastConversationExcerpt: "ok thanks for checking",
  },
];
