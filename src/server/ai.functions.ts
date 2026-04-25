import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { parseAIResponse, type AIAnalysis } from "@/utils/parseAIResponse";
import { parseChatActionPlan, type ChatActionPlan } from "@/utils/chatActions";

const ILMU_CHAT_URL = "https://api.ilmu.ai/v1/chat/completions";
const ILMU_MODELS_URL = "https://api.ilmu.ai/v1/models";
const DEFAULT_MODEL = "ilmu-glm-5.1";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().optional().default(""),
        }),
      }),
    )
    .min(1),
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
    (typeof process !== "undefined" ? process.env.ILMU_API_KEY : undefined) ||
    (typeof process !== "undefined" ? process.env.VITE_ILMU_API_KEY : undefined) ||
    "";
  const key = (apiKey || "").trim() || envKey.trim();
  if (!key) throw new Error("Missing API key. Set it in Settings first.");
  return key;
}

async function callIlmuChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
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

  const parsed = chatResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("AI provider response format is invalid.");
  }

  return parsed.data.choices[0]?.message.content?.trim() || "";
}

export const testIlmuConnection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);

    const modelsRes = await fetch(ILMU_MODELS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!modelsRes.ok) {
      const detail = await readApiError(modelsRes);
      throw new Error(`Connection test failed (${modelsRes.status}): ${detail}`);
    }

    const modelResponse = (await modelsRes.json()) as {
      data?: Array<{ id?: string }>;
    };
    const availableModels = (modelResponse.data || [])
      .map((m) => m.id)
      .filter((id): id is string => !!id);

    const requestedModel = data.model?.trim() || DEFAULT_MODEL;
    const selectedModel = availableModels.includes(requestedModel)
      ? requestedModel
      : (availableModels[0] ?? requestedModel);

    return {
      ok: true,
      selectedModel,
      availableModels,
    };
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
  .handler(async ({ data }): Promise<AIAnalysis> => {
    const apiKey = requireApiKey(data.apiKey);

    const userText = [
      data.contextBlock ? `## CONTEXT\n${data.contextBlock}` : "",
      "## TASK",
      "Analyze the conversation and return only valid JSON following the required schema.",
      "## CONVERSATION",
      data.formattedConversation,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await callIlmuChat({
      apiKey,
      model: data.model,
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      maxTokens: 1800,
    });

    const parsed = parseAIResponse(raw);
    if (!parsed) {
      throw new Error("Model returned non-JSON analysis. Try again or adjust model.");
    }

    return parsed;
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

    const reply = await callIlmuChat({
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

    const raw = await callIlmuChat({
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
