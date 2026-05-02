export const DEFAULT_MODEL = "deepseek-v4-flash";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

function getApiKey(): string {
  const key =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.VITE_DEEPSEEK_API_KEY?.trim() ||
    "";
  if (!key) throw new Error("Missing DeepSeek API key. Set DEEPSEEK_API_KEY in .env");
  return key;
}

function toOpenAIMessages(
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

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content?.trim() || "";
}

export async function callGeminiChat(opts: {
  model?: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  const model = opts.model || DEFAULT_MODEL;
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: toOpenAIMessages(opts.systemPrompt, opts.messages),
      max_tokens: opts.maxTokens ?? 1500,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek API request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const payload = await res.json();
  return extractText(payload);
}
