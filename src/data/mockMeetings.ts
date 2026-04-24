export type Meeting = {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  time: string; // "3:00 PM"
  duration: string;
  purpose: string;
  status: "Scheduled" | "Pending Confirm" | "Done";
};

const today = new Date();
const d = (offset: number) => {
  const x = new Date(today);
  x.setDate(today.getDate() + offset);
  return x.toISOString().split("T")[0];
};

export const mockMeetings: Meeting[] = [
  { id: "mt1", customerId: "c5", customerName: "David Tan", date: d(2), time: "3:00 PM", duration: "45 min", purpose: "Bulk order discussion (50 boxes/month)", status: "Pending Confirm" },
  { id: "mt2", customerId: "c3", customerName: "Raj Kumar", date: d(1), time: "11:00 AM", duration: "30 min", purpose: "Discount negotiation — 10 box quote", status: "Scheduled" },
  { id: "mt3", customerId: "c2", customerName: "Siti Binti", date: d(0), time: "4:30 PM", duration: "20 min", purpose: "Follow-up on previous order issue", status: "Scheduled" },
  { id: "mt4", customerId: "c1", customerName: "Ah Kow", date: d(2), time: "2:30 PM", duration: "30 min", purpose: "Address verification & repeat order setup", status: "Pending Confirm" },
  { id: "mt5", customerId: "c4", customerName: "Nurul Hana", date: d(-2), time: "10:00 AM", duration: "20 min", purpose: "VIP onboarding", status: "Done" },
];
