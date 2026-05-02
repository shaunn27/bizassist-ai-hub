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

export const mockMeetings: Meeting[] = [];
