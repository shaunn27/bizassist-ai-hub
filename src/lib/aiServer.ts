import { createServerFn } from "@tanstack/react-start";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiRole = "system" | "user" | "assistant";

type GeminiMessage = {
  role: GeminiRole;
  content: string;
};

type GeminiChatInput = {
  apiKey: string;
  model: string;
  messages: GeminiMessage[];
  maxTokens?: number;
  temperature?: number;
};

function ensureValidInput(data: GeminiChatInput): GeminiChatInput {
  if (!data.apiKey?.trim()) {
    throw new Error("Missing API key.");
  }
  if (!data.model?.trim()) {
    throw new Error("Missing model.");
  }
  if (!Array.isArray(data.messages) || data.messages.length === 0) {
    throw new Error("Missing chat messages.");
  }

  return {
    ...data,
    apiKey: data.apiKey.trim(),
    model: data.model.trim(),
  };
}

function toGeminiContents(messages: GeminiMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
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

export const callGeminiChatServer = createServerFn({ method: "POST" })
  .inputValidator((data: GeminiChatInput) => ensureValidInput(data))
  .handler(async ({ data }) => {
    const res = await fetch(
      `${GEMINI_BASE_URL}/models/${data.model}:generateContent?key=${data.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: toGeminiContents(data.messages),
          generationConfig: {
            maxOutputTokens: data.maxTokens ?? 1500,
            temperature: data.temperature ?? 0.2,
          },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API ${res.status}: ${text.slice(0, 300)}`);
    }

    const payload = await res.json();
    return extractGeminiText(payload);
  });
