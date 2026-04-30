const ILMU_CHAT_URL = "https://api.ilmu.ai/v1/chat/completions";
const ILMU_MODELS_URL = "https://api.ilmu.ai/v1/models";
const DEFAULT_MODEL = "ilmu-glm-5.1";

function getEnv(name) {
  return (process.env[name] || "").trim();
}

export function requireApiKey(apiKey) {
  const envKey = getEnv("ILMU_API_KEY") || getEnv("VITE_ILMU_API_KEY");
  const key = (apiKey || "").trim() || envKey;
  if (!key) {
    throw new Error("Missing API key. Set it in Settings first.");
  }
  return key;
}

export async function readApiError(res) {
  const raw = await res.text();
  if (!raw) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || raw.slice(0, 400);
  } catch {
    return raw.slice(0, 400);
  }
}

export async function callIlmuChat(opts) {
  const res = await fetch(ILMU_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`AI request failed (${res.status}): ${detail}`);
  }

  const parsed = await res.json();
  const content = parsed?.choices?.[0]?.message?.content;
  return (typeof content === "string" ? content.trim() : "") || "";
}

export { DEFAULT_MODEL, ILMU_CHAT_URL, ILMU_MODELS_URL };
