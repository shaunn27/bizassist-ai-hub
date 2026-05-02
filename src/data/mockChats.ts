export type ChatMessage = {
  id: string;
  from: "customer" | "agent";
  side?: "left" | "right";
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
