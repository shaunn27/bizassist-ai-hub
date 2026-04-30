import type { ChatThread } from "@/data/mockChats";
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
