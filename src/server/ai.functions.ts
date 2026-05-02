import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseChatActionPlan, type ChatActionPlan } from "@/utils/chatActions";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

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
    (typeof process !== "undefined" ? process.env.DEEPSEEK_API_KEY : undefined) ||
    (typeof process !== "undefined" ? process.env.VITE_DEEPSEEK_API_KEY : undefined) ||
    "";
  const key = (apiKey || "").trim() || envKey.trim();
  if (!key) throw new Error("Missing API key. Set it in Settings first.");
  return key;
}

function toMessages(
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

async function callDeepSeekChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const model = opts.model || DEFAULT_MODEL;
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

export const testConnection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const model = data.model?.trim() || DEFAULT_MODEL;

    // Test with a simple completion
    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (!res.ok) {
      const detail = await readApiError(res);
      throw new Error(`Connection test failed (${res.status}): ${detail}`);
    }

    return { ok: true, selectedModel: model, availableModels: [model] };
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

    const raw = await callDeepSeekChat({
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

    const reply = await callDeepSeekChat({
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

    const raw = await callDeepSeekChat({
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

export const generateSmartReplies = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ replies: string[] }> => {
    const apiKey = requireApiKey(data.apiKey);

    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt:
        "You are a customer support assistant. Generate 3 short, professional reply suggestions that the agent can send to the customer. Each reply should be 1-2 sentences. Return ONLY a JSON array of 3 strings, nothing else.",
      messages: [
        {
          role: "user",
          content: `Based on this conversation, suggest 3 replies the agent should send next:\n\n${data.formattedConversation}`,
        },
      ],
      maxTokens: 400,
    });

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(parsed)) return { replies: parsed.slice(0, 3).map(String) };
      }
    } catch { /* fallback below */ }

    return {
      replies: [
        "Thanks for reaching out! Let me check on that for you.",
        "I understand your concern. Let me look into this right away.",
        "Got it! I'll get back to you with an update shortly.",
      ],
    };
  });

export const analyzeSentiment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      lastMessages: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ sentiment: string; emoji: string }> => {
    const apiKey = requireApiKey(data.apiKey);

    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt:
        "You analyze customer sentiment for a support chat. Return ONLY a JSON object: {sentiment: string, emoji: string}. Sentiment must be one of: positive, neutral, negative, angry. Emoji must be one: 😊 😐 😤 😡",
      messages: [
        { role: "user", content: `Analyze the sentiment of these customer messages:\n${data.lastMessages}` },
      ],
      maxTokens: 80,
    });

    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(raw.slice(start, end + 1)) as { sentiment?: string; emoji?: string };
        const valid = ["positive", "neutral", "negative", "angry"];
        return {
          sentiment: valid.includes(parsed.sentiment || "") ? parsed.sentiment! : "neutral",
          emoji: parsed.emoji || "😐",
        };
      }
    } catch { /* fallback below */ }

    return { sentiment: "neutral", emoji: "😐" };
  });

export const generateConversationSummary = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
      customerProfile: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "You summarize customer service conversations into structured handoff notes. Return ONLY valid JSON.",
      messages: [{
        role: "user",
        content: `${data.customerProfile ? "Customer: " + data.customerProfile + "\n\n" : ""}Conversation:\n${data.formattedConversation}\n\nReturn JSON: { "customerIntent": "one sentence", "sentimentTrend": "improving|stable|declining", "sentimentSummary": "one sentence", "keyDecisions": ["string"], "actionItems": [{"task":"string","assignee":"agent|customer|system","status":"done|pending|blocked","priority":"high|medium|low"}], "riskLevel": "low|medium|high|critical", "riskReason": "string", "handoffNote": "2-3 sentence shift handoff summary", "recommendedNextStep": "one sentence", "estimatedResolutionTime": "string" }`,
      }],
      maxTokens: 800,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return { customerIntent: "Review needed", sentimentTrend: "stable", sentimentSummary: "", keyDecisions: [], actionItems: [], riskLevel: "medium", riskReason: null, handoffNote: "Please review the conversation manually.", recommendedNextStep: "Review conversation", estimatedResolutionTime: "Unknown" };
  });

export const detectOrderIntent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
      productCatalog: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "You detect order information from customer conversations and match to the product catalog. Return ONLY valid JSON.",
      messages: [{
        role: "user",
        content: `Catalog:\n${data.productCatalog}\n\nConversation:\n${data.formattedConversation}\n\nReturn JSON: { "orderDetected": boolean, "confidence": number, "items": [{"name":"catalog name","sku":"string","qty":number,"unitPrice":number,"lineTotal":number}], "total": number, "customerName": "string", "missingFields": ["string"] }`,
      }],
      maxTokens: 500,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) { const p = JSON.parse(raw.slice(s, e + 1)); if (p.orderDetected) return p; }
    } catch { /* no order */ }
    return { orderDetected: false };
  });

export const scoreConversationPriority = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      conversations: z.array(z.object({
        customerId: z.string(), customerName: z.string().optional(),
        lastMessagePreview: z.string(), waitingMinutes: z.number(), unread: z.number(),
        flagged: z.enum(["critical", "warning", "info"]).nullable(), sentiment: z.string().optional(),
      })),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const summaries = data.conversations.map(c => ({ id: c.customerId, name: c.customerName || "Unknown", last: c.lastMessagePreview, wait: c.waitingMinutes, unread: c.unread, flagged: c.flagged, sentiment: c.sentiment }));
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "You triage customer support conversations by urgency (1-100). Consider: angry sentiment=high, long wait=high, critical flag=high, keywords like cancel/urgent/refund=high. Return ONLY a JSON array.",
      messages: [{ role: "user", content: `Score: ${JSON.stringify(summaries)}\n\nReturn JSON array: [{"customerId":"string","score":number,"reason":"one sentence"}]` }],
      maxTokens: 600,
    });
    try {
      const s = raw.indexOf("["), e = raw.lastIndexOf("]");
      if (s !== -1 && e !== -1) return { scores: JSON.parse(raw.slice(s, e + 1)) };
    } catch { /* fallback */ }
    const scores = data.conversations.map(c => {
      let score = 50;
      if (c.waitingMinutes > 15) score += 25;
      if (c.flagged === "critical") score += 20;
      if (c.sentiment === "angry" || c.sentiment === "negative") score += 15;
      if (c.unread > 2) score += 10;
      return { customerId: c.customerId, score: Math.min(score, 100), reason: "Rule-based scoring" };
    });
    return { scores };
  });

export const generateAutoPilotReply = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      formattedConversation: z.string().min(1),
      productCatalog: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const reply = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "You are an AI customer service agent for a Malaysian SME. Reply directly to the customer in 1-3 sentences. Use Manglish/Bahasa when appropriate. Confirm orders clearly. NEVER mention you are AI. Sign as 'Sarah'.",
      messages: [{ role: "user", content: `Catalog: ${data.productCatalog}\n\nReply to this conversation:\n${data.formattedConversation}` }],
      maxTokens: 200,
    });
    const actionRaw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "Return ONLY valid JSON. Detect if customer's latest message indicates a confirmed order or meeting request.",
      messages: [{ role: "user", content: `Conversation:\n${data.formattedConversation}\n\nReturn JSON: { "hasOrder": boolean, "items": ["string"], "total": number|null, "hasMeeting": boolean, "meetingPurpose": "string|null" }` }],
      maxTokens: 200,
    });
    let autoAction = null;
    try {
      const s = actionRaw.indexOf("{"), e = actionRaw.lastIndexOf("}");
      if (s !== -1 && e !== -1) autoAction = JSON.parse(actionRaw.slice(s, e + 1));
    } catch { /* no action */ }
    return { reply, autoAction };
  });

export const generateDailyBriefing = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1),
      dashboardData: z.object({
        openChats: z.number(), pendingOrders: z.number(), pendingOrderValue: z.number(),
        meetingsToday: z.number(), lowStockProducts: z.array(z.object({ name: z.string(), stock: z.number() })),
        flaggedConversations: z.array(z.object({ customerName: z.string(), reason: z.string(), waitMinutes: z.number() })),
        angryCustomers: z.array(z.object({ name: z.string() })),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const d = data.dashboardData;
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model,
      systemPrompt: "You are an AI business analyst generating a morning briefing for an SME owner. Be specific and actionable. Use RM currency. Return ONLY valid JSON.",
      messages: [{ role: "user", content: `Data: ${JSON.stringify(d)}\n\nReturn JSON: { "greeting": "one sentence", "urgentItems": [{"text":"string","severity":"critical|warning|info"}], "churnRiskCount": number, "revenueAtRisk": number, "inventoryAlertCount": number, "topPriorityAction": "one sentence", "overallMood": "great|good|concerning|critical" }` }],
      maxTokens: 600,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return {
      greeting: `You have ${d.openChats} open chats and ${d.pendingOrders} pending orders.`,
      urgentItems: d.flaggedConversations.map(f => ({ text: `${f.customerName}: ${f.reason}`, severity: f.waitMinutes > 20 ? "critical" : "warning" })),
      churnRiskCount: d.angryCustomers.length, revenueAtRisk: d.pendingOrderValue,
      inventoryAlertCount: d.lowStockProducts.length,
      topPriorityAction: d.flaggedConversations[0] ? `Respond to ${d.flaggedConversations[0].customerName}` : "Review pending orders",
      overallMood: d.flaggedConversations.length > 3 ? "concerning" : "good",
    };
  });
