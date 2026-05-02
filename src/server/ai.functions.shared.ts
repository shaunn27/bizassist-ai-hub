export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_MODEL = "deepseek-v4-flash";

export async function readApiError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return parsed.error?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
}

export function requireApiKey(apiKey: string): string {
  const envKey =
    (typeof process !== "undefined" ? process.env.DEEPSEEK_API_KEY : undefined) ||
    (typeof process !== "undefined" ? process.env.VITE_DEEPSEEK_API_KEY : undefined) ||
    "";
  const key = (apiKey || "").trim() || envKey.trim();
  if (!key) throw new Error("Missing API key. Set it in Settings first.");
  return key;
}

export function toMessages(
  systemPrompt: string | undefined,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const result: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (systemPrompt) result.push({ role: "system", content: systemPrompt });
  for (const m of messages) {
    result.push({ role: m.role, content: m.content });
  }
  return result;
}

export function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content?.trim() || "";
}

export async function callDeepSeekChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const VALID_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"];
  const model = VALID_MODELS.includes(opts.model) ? opts.model : DEFAULT_MODEL;
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: toMessages(opts.systemPrompt, opts.messages),
      max_tokens: opts.maxTokens ?? 1500,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`AI request failed (${res.status}): ${detail}`);
  }

  const payload = await res.json();
  return extractText(payload);
}
