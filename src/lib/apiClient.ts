import type { ChatThread } from "@/data/mockChats";
import type { Order } from "@/data/mockOrders";
import type { Meeting } from "@/data/mockMeetings";
import type { Customer } from "@/data/mockCustomers";
import type { Product } from "@/data/mockProducts";
import type { AIAnalysis } from "@/utils/parseAIResponse";
import type { ChatActionPlan } from "@/utils/chatActions";

type ApiErrorPayload = { error?: string };

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON response.");
  }
}

function getErrorMessage(payload: ApiErrorPayload, res: Response) {
  if (payload?.error) return payload.error;
  return `Request failed (${res.status})`;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "GET" });
  const payload = await parseJsonResponse<T & ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(payload, res));
  }
  return payload as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await parseJsonResponse<T & ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(payload, res));
  }
  return payload as T;
}

export async function listPersistedChats(): Promise<{ configured: boolean; chats: ChatThread[] }> {
  return getJson("/api/chat/list");
}

export async function upsertPersistedChat(
  thread: ChatThread,
): Promise<{ configured: boolean; ok: boolean }> {
  return postJson("/api/chat/upsert", { thread });
}

export async function persistConfirmedOrder(input: {
  customerName: string;
  customerPhone?: string;
  items: string[];
  total: number;
  chatExcerpt?: string;
}): Promise<{ configured: boolean; ok: boolean; orderId?: string; customerId?: string; orderNo?: string }> {
  return postJson("/api/orders/confirm", input);
}

export async function persistConfirmedMeeting(input: {
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  duration: string;
  purpose: string;
}): Promise<{ configured: boolean; ok: boolean; meetingId?: string; customerId?: string }> {
  return postJson("/api/meetings/confirm", input);
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: Order["status"];
}): Promise<{ configured: boolean; ok: boolean; orderNo?: string; status?: string }> {
  return postJson("/api/orders/status", input);
}

export async function updateMeetingStatus(input: {
  meetingId: string;
  status: Meeting["status"];
}): Promise<{ configured: boolean; ok: boolean; meetingId?: string; status?: string }> {
  return postJson("/api/meetings/status", input);
}

export async function listOrders(): Promise<{ configured: boolean; orders: Order[] }> {
  return getJson("/api/orders/list");
}

export async function listMeetings(): Promise<{ configured: boolean; meetings: Meeting[] }> {
  return getJson("/api/meetings/list");
}

export async function listCustomers(): Promise<{ configured: boolean; customers: Customer[] }> {
  return getJson("/api/customers/list");
}

export async function listProducts(): Promise<{ configured: boolean; products: Product[] }> {
  return getJson("/api/products/list");
}

export async function testIlmuConnection(input: {
  apiKey?: string;
  model?: string;
}): Promise<{ ok: boolean; selectedModel: string; availableModels: string[] }> {
  return postJson("/api/ai/test", input);
}

export async function chatWithAiAssistant(input: {
  apiKey?: string;
  model: string;
  contextBlock?: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<{ reply: string }> {
  return postJson("/api/ai/chat", input);
}

export async function analyzeConversation(input: {
  apiKey?: string;
  model: string;
  formattedConversation: string;
  contextBlock?: string;
}): Promise<AIAnalysis> {
  return postJson("/api/ai/analyze", input);
}

export async function generateChatActionPlan(input: {
  apiKey?: string;
  model: string;
  formattedConversation: string;
  contextBlock?: string;
}): Promise<ChatActionPlan> {
  return postJson("/api/ai/actions", input);
}

export async function simulateCustomerReply(input: {
  customerId: string;
  customerName?: string;
  messages: Array<{
    id: string;
    from: "customer" | "agent";
    type: "text" | "image" | "voice";
    text?: string;
    filename?: string;
    duration?: string;
    time: string;
    timestamp: number;
  }>;
  productCatalog?: string;
}): Promise<{ reply: string; skipped: boolean }> {
  return postJson("/api/ai/simulate-customer", input);
}
