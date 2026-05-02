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

export const mockOrders: Order[] = [];
