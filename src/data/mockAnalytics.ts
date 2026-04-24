export const messagesByHour = [
  { hour: "8AM", messages: 3 }, { hour: "9AM", messages: 6 }, { hour: "10AM", messages: 8 },
  { hour: "11AM", messages: 11 }, { hour: "12PM", messages: 5 }, { hour: "1PM", messages: 4 },
  { hour: "2PM", messages: 7 }, { hour: "3PM", messages: 10 }, { hour: "4PM", messages: 6 },
  { hour: "5PM", messages: 4 }, { hour: "6PM", messages: 2 }, { hour: "7PM", messages: 1 },
  { hour: "8PM", messages: 0 },
];

export const ordersThisWeek = [
  { day: "Mon", orders: 6 }, { day: "Tue", orders: 8 }, { day: "Wed", orders: 7 },
  { day: "Thu", orders: 10 }, { day: "Fri", orders: 12 }, { day: "Sat", orders: 14 }, { day: "Sun", orders: 11 },
];

export const revenueThisWeek = [
  { day: "Mon", revenue: 420 }, { day: "Tue", revenue: 580 }, { day: "Wed", revenue: 510 },
  { day: "Thu", revenue: 720 }, { day: "Fri", revenue: 890 }, { day: "Sat", revenue: 1100 }, { day: "Sun", revenue: 940 },
];

export const orderStatusBreakdown = [
  { name: "Delivered", value: 31 },
  { name: "Processing", value: 12 },
  { name: "Confirmed", value: 8 },
  { name: "Pending", value: 5 },
];

export const agentPerformance = [
  { agent: "Sarah Lim", chats: 23, avgReply: "3.1 min", ordersClosed: 11 },
  { agent: "Ahmad Z.", chats: 18, avgReply: "5.4 min", ordersClosed: 7 },
  { agent: "Priya R.", chats: 14, avgReply: "4.8 min", ordersClosed: 6 },
];

export const aiPerformance = [
  { metric: "Suggestions used by agent", today: 38, week: 201 },
  { metric: "Flags correctly raised", today: 11, week: 67 },
  { metric: "Auto-extracted orders", today: 9, week: 52 },
  { metric: "Avg confidence score", today: "84%", week: "81%" },
];

export const recentFlags = [
  { severity: "critical", text: "Unresponded >30min — Ah Kow", customerId: "c1" },
  { severity: "critical", text: "Cancellation intent — Raj Kumar", customerId: "c3" },
  { severity: "warning", text: "Missing delivery address — Siti Binti", customerId: "c2" },
  { severity: "warning", text: "Ambiguous order ref — Nurul H.", customerId: "c4" },
  { severity: "info", text: "Price inquiry unanswered — David T.", customerId: "c5" },
];
