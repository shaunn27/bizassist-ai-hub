import { createServerFn } from "@tanstack/react-start";

const ILMU_BASE_URL = "https://api.ilmu.ai/v1";

type IlmuRole = "system" | "user" | "assistant";

type IlmuMessage = {
  role: IlmuRole;
  content: string;
};

type IlmuChatInput = {
  apiKey: string;
  model: string;
  messages: IlmuMessage[];
  maxTokens?: number;
  temperature?: number;
};

function ensureValidInput(data: IlmuChatInput): IlmuChatInput {
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

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const maybeText = (part as { text?: unknown }).text;
      return typeof maybeText === "string" ? maybeText : "";
    })
    .join("\n")
    .trim();
}

export const callIlmuChatServer = createServerFn({ method: "POST" })
  .inputValidator((data: IlmuChatInput) => ensureValidInput(data))
  .handler(async ({ data }) => {
    const res = await fetch(`${ILMU_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.apiKey}`,
      },
      body: JSON.stringify({
        model: data.model,
        max_tokens: data.maxTokens ?? 1500,
        temperature: data.temperature ?? 0.2,
        messages: data.messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ilmu API ${res.status}: ${text.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    return extractTextContent(payload?.choices?.[0]?.message?.content);
  });
