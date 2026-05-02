import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const chatCopilot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      question: z.string(),
      businessName: z.string().optional().default("BizAssist"),
      businessData: z.string().optional().default(""),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional().default([]),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const messages = [...data.history, { role: "user" as const, content: data.question }];
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are BizAssist AI Copilot — a witty, data-savvy business advisor for Malaysian SME "${data.businessName}". Answer questions about sales, customers, inventory, and growth. Use RM for currency. Be concise, actionable, and friendly. If asked about data, reference the provided business context. You can suggest charts by including a JSON block like: {"chart":{"type":"bar|line","title":"...","data":[{"label":"...","value":0}]}}. Return plain text with optional chart JSON.`,
      messages,
      maxTokens: 800,
    });
    let chartData = null;
    const chartMatch = raw.match(/\{"chart":\s*\{[^}]+\}\s*\}/);
    if (chartMatch) {
      try {
        const parsed = JSON.parse(chartMatch[0]);
        chartData = parsed.chart;
      } catch { /* ignore */ }
    }
    const reply = raw.replace(/\{"chart":\s*\{[^}]+\}\s*\}/, "").trim();
    return { reply, chartData };
  });
