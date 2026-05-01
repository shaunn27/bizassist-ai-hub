import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseChatActionPlan, type ChatActionPlan } from "@/utils/chatActions";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

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

function requireApiKey(apiKey: string): string {
  const envKey =
    (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined) ||
    (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : undefined) ||
    "";
  const key = (apiKey || "").trim() || envKey.trim();
  if (!key) throw new Error("Missing API key. Set it in Settings first.");
  return key;
}

function stripModelPrefix(name: string | undefined): string {
  if (!name) return "";
  return name.replace(/^models\//, "");
}

function toGeminiContents(messages: Array<{ role: "user" | "assistant"; content: string }>) {
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

async function callGeminiChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const model = opts.model || DEFAULT_MODEL;
  const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${opts.apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
  });

  if (!res.ok) {
    const detail = await readApiError(res);
    throw new Error(`AI request failed (${res.status}): ${detail}`);
  }

  const payload = await res.json();
  return extractGeminiText(payload);
}

export const testGeminiConnection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);

    const modelsRes = await fetch(`${GEMINI_BASE_URL}/models?key=${apiKey}`, {
      method: "GET",
    });

    if (!modelsRes.ok) {
      const detail = await readApiError(modelsRes);
      throw new Error(`Connection test failed (${modelsRes.status}): ${detail}`);
    }

    const modelResponse = (await modelsRes.json()) as {
      models?: Array<{ name?: string }>;
    };
    const availableModels = (modelResponse.models || [])
      .map((m) => stripModelPrefix(m.name))
      .filter((name): name is string => !!name);

    const requestedModel = data.model?.trim() || DEFAULT_MODEL;
    const selectedModel = availableModels.includes(requestedModel)
      ? requestedModel
      : (availableModels[0] ?? requestedModel);

    return { ok: true, selectedModel, availableModels };
  });

export const analyzeConversation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
      contextBlock: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }): Promise<string> => {
    const apiKey = requireApiKey(data.apiKey);

    const userText = [
      "Adjusted Prompt",
      "Analyze the chat history between a customer and an agent (user). Extract only the important business-related items. Output them in the following plain key-value format - no tables, no markdown, no extra decoration.",
      "",
      "Use these categories only if data exists:",
      "",
      "ORDERS",
      "For each order:",
      "Order ID - [value]",
      "Item - [value]",
      "Qty - [number]",
      "Delivery Deadline - [date or \"null\"]",
      "Status - [value]",
      "",
      "MEETINGS",
      "For each meeting:",
      "Date - [actual date, calculate from relative terms like \"tomorrow\" using chat date][YYYY-MM-DD or \"null\"]",
      "Time - [HH:MM AM/PM or \"null\"]",
      "Attendees - [comma separated]",
      "Purpose - [short text]",
      "",
      "DECISIONS",
      "For each decision:",
      "- [short text]",
      "",
      "DEADLINES",
      "For each deadline:",
      "[clear task name description] - [date]",
      "",
      "ISSUES / RISKS",
      "For each issue:",
      "- [short text]",
      "",
      "PAYMENTS",
      "If amount not mentioned: Amount - Not specified",
      "For each payment:",
      "Payer - [name]",
      "Amount - [number or \"null\"]",
      "Due Date - [date or \"null\"]",
      "Status - [Paid / Unpaid / Pending]",
      "",
      "Rules:",
      "- Do not use tables, pipes, or markdown.",
      "- Write each field on a new line.",
      "- If multiple orders/meetings/payments, separate them with a blank line.",
      "- If a category is empty, omit it entirely.",
      "- blank a line after every part",
      "- easy to see and understand",
      "- For meeting dates: If a relative day is given (e.g., \"tomorrow\", \"next Tuesday\"), calculate the actual date based on the chat's timestamp. Assume the chat date is the date of the first message.",
      "- For deadlines: Use the format \"Task Name - Date\". If the task is an order delivery, write \"Order [ID] delivery - [date]\".",
      "- If an amount is not mentioned, write \"Amount - Not specified\" instead of null.",
      "",
      data.contextBlock ? `## CONTEXT\n${data.contextBlock}` : "",
      "## CONVERSATION",
      data.formattedConversation,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await callGeminiChat({
      apiKey,
      model: data.model,
      messages: [{ role: "user", content: userText }],
      maxTokens: 4096,
    });

    if (!raw.trim()) {
      throw new Error("Model returned an empty analysis. Try again or adjust model.");
    }

    return raw;
  });

export const chatWithAiAssistant = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      contextBlock: z.string().optional().default(""),
      history: z.array(messageSchema).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);

    const bootstrap = data.contextBlock.trim()
      ? [
          {
            role: "user" as const,
            content: `Use this context when assisting the support agent.\n\n${data.contextBlock}`,
          },
        ]
      : [];

    const reply = await callGeminiChat({
      apiKey,
      model: data.model,
      systemPrompt:
        "You are an assistant for customer support agents. Be concise, practical, and action-oriented.",
      messages: [...bootstrap, ...data.history],
      maxTokens: 1000,
    });

    if (!reply) {
      throw new Error("Model returned an empty response.");
    }

    return { reply };
  });

export const generateChatActionPlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
      contextBlock: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }): Promise<ChatActionPlan> => {
    const apiKey = requireApiKey(data.apiKey);

    const userText = [
      data.contextBlock ? `## CONTEXT\n${data.contextBlock}` : "",
      "## TASK",
      "Analyze the conversation and return only valid JSON with a proposals array.",
      "For each proposal include id, kind, title, summary, confidence, rationale, missingFields, and any draft payload.",
      "Allowed kinds: order, meeting, refund, escalation, inventory.",
      "For meeting proposals include a concrete date (YYYY-MM-DD), time, duration, and purpose.",
      "For order proposals include items as an array and a total when it can be inferred.",
      "Prefer proposals that an operator can confirm with one click.",
      "## CONVERSATION",
      data.formattedConversation,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await callGeminiChat({
      apiKey,
      model: data.model,
      systemPrompt:
        "You transform support conversations into structured operational action proposals. Return only JSON.",
      messages: [{ role: "user", content: userText }],
      maxTokens: 1800,
    });

    const parsed = parseChatActionPlan(raw);
    if (!parsed) {
      throw new Error("Model returned invalid action plan JSON. Try again or adjust model.");
    }

    return parsed;
  });
