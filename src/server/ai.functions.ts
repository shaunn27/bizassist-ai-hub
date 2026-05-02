import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseChatActionPlan, type ChatActionPlan } from "@/utils/chatActions";
import fs from "node:fs/promises";
import path from "node:path";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";
const ANALYSIS_CACHE_PATH = "E:\\TempDataUMHACK\\result.txt";

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

async function readAnalysisCache(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(ANALYSIS_CACHE_PATH, "utf-8");
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const cache: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") cache[key] = value;
    }
    return cache;
  } catch (err: unknown) {
    const code = err && typeof err === "object" ? (err as { code?: string }).code : undefined;
    if (code === "ENOENT") return {};
    return {};
  }
}

async function writeAnalysisCache(cache: Record<string, string>): Promise<void> {
  await fs.mkdir(path.dirname(ANALYSIS_CACHE_PATH), { recursive: true });
  await fs.writeFile(ANALYSIS_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
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
      chatId: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<string> => {
    const apiKey = requireApiKey(data.apiKey);
    const chatId = data.chatId?.trim();

    if (chatId) {
      const cache = await readAnalysisCache();
      const cached = cache[chatId];
      if (cached?.trim()) {
        return cached;
      }
    }

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

    if (chatId) {
      try {
        const cache = await readAnalysisCache();
        cache[chatId] = raw.trim();
        await writeAnalysisCache(cache);
      } catch (err: unknown) {
        console.debug("Failed to write analysis cache:", err);
      }
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

export const generateChatOrdersMeetings = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      customerName: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; filePath?: string; error?: string }> => {
    const apiKey = requireApiKey(data.apiKey);
    const CHAT_HISTORY_DIR = "E:\\bizassist-data";
    const CHAT_ANALYSIS_DIR = "E:\\bizassist-data-responce";
    const ACTION_OUTPUT_DIR = "E:\\bizzasist-data-action";

    function sanitize(name: string): string {
      return name.trim().replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ").slice(0, 120) || "chat";
    }

    const safeName = sanitize(data.customerName);

    // Read chat history file
    let chatHistory = "";
    try {
      const historyPath = path.join(CHAT_HISTORY_DIR, `${safeName}.txt`);
      chatHistory = await fs.readFile(historyPath, "utf-8");
      // Strip BizAssistMeta line if present
      const lines = chatHistory.split(/\r?\n/);
      if (lines[0]?.startsWith("## BizAssistMeta:")) {
        chatHistory = lines.slice(1).join("\n");
      }
    } catch {
      chatHistory = "";
    }

    // Read analysis / response file
    let analysisText = "";
    try {
      const analysisPath = path.join(CHAT_ANALYSIS_DIR, `${safeName}.txt`);
      analysisText = await fs.readFile(analysisPath, "utf-8");
    } catch {
      analysisText = "";
    }

    const combinedChat = [
      chatHistory.trim() ? chatHistory.trim() : "(No chat history found)",
      analysisText.trim() ? `\n\n--- Previous AI Analysis ---\n${analysisText.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = [
      "You are given a chat history between a customer and an agent. Extract all orders and meetings discussed.",
      "Output them in the following **plain text format** – do NOT use JSON, markdown, or tables.",
      "",
      "For each order, output exactly:",
      "",
      "--- ORDER ---",
      "id: [generate a unique ID like ORD-xxxx]",
      "customerId: [use \"c1\", \"c2\", etc. or generate consistently]",
      `customerName: [customer name from chat, use "${data.customerName}" if not found]`,
      "items: [quantity x description, e.g., \"2x Premium Chocolate\"]",
      "total: [number or \"unknown\"]",
      "source: [WhatsApp | Telegram | SMS | etc.]",
      "receivedAt: [time or relative like \"09:42 AM\" or \"Yesterday\"]",
      "status: [Pending | Confirmed | Processing | Delivered | Canceled]",
      "chatExcerpt: [brief quote from customer about this order]",
      "timeline: [Created:time:done, Confirmed:time:done, Processing:time:done, Delivered:time:done]",
      "--- END ---",
      "",
      "For each meeting, output exactly:",
      "",
      "--- MEETING ---",
      "id: [generate like mt1, mt2]",
      "customerId: [same as order customerId if known, else generate]",
      "customerName: [name]",
      "date: [YYYY-MM-DD or relative like \"Tomorrow\"]",
      "time: [HH:MM AM/PM]",
      "duration: [e.g., \"30 min\"]",
      "purpose: [short description]",
      "status: [Pending Confirm | Scheduled | Done | Cancelled]",
      "--- END ---",
      "",
      "Rules:",
      "- Use the chat history only. If a field is not mentioned, use \"Not specified\" or a reasonable default.",
      "- For timeline, each field is \"label:time:done\" where \"label\" is exactly Created, Confirmed, Processing, Delivered. Use \"—\" for time if not done, and \"false\" for done status (or \"true\").",
      "- For dates, convert relative terms like \"tomorrow\" to actual date if chat timestamp is given, otherwise keep as \"Tomorrow\".",
      "- Output all orders first, then all meetings. Separate each block with a blank line.",
      "",
      "Chat history:",
      combinedChat,
    ].join("\n");

    const raw = await callGeminiChat({
      apiKey,
      model: data.model,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4096,
    });

    if (!raw.trim()) {
      return { ok: false, error: "AI returned empty output." };
    }

    // Save to action output folder
    try {
      await fs.mkdir(ACTION_OUTPUT_DIR, { recursive: true });
      const outPath = path.join(ACTION_OUTPUT_DIR, `${safeName}.txt`);
      await fs.writeFile(outPath, raw.trim(), "utf-8");
      return { ok: true, filePath: outPath };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `AI output generated but failed to save: ${message}` };
    }
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
