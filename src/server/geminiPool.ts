export const DEFAULT_MODEL = "gemini-2.5-flash";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  for (let i = 1; i <= 4; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (key) return key;
  }
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key) throw new Error("Missing Gemini API key. Set GEMINI_API_KEY in .env");
  return key;
}

function toGeminiContents(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

async function readApiError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return parsed.error?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
    .candidates;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("\n")
    .trim();
}

export async function callGeminiChat(opts: {
  model?: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  const model = opts.model || DEFAULT_MODEL;
  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiContents(opts.messages),
        ...(opts.systemPrompt
          ? { systemInstruction: { parts: [{ text: opts.systemPrompt }] } }
          : {}),
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1500,
          temperature: 0.2,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`Gemini API request failed (${res.status}): ${detail}`);
  }

  const payload = await res.json();
  return extractGeminiText(payload);
}
