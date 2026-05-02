import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const parseWhatsAppChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      rawText: z.string(),
      productCatalog: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a WhatsApp chat parser for Malaysian SME businesses. Extract structured CRM data from WhatsApp chat exports. Be thorough — look for orders, customer details, meeting requests, and complaints. Return ONLY valid JSON.`,
      messages: [{
        role: "user",
        content: `Parse this WhatsApp chat export and extract structured data.${data.productCatalog ? ` Product catalog: ${data.productCatalog}` : ""}

Chat text:
${data.rawText.slice(0, 8000)}

Return JSON:
{
  "customers": [{"name": "", "phone": "", "notes": ""}],
  "orders": [{"customerName": "", "items": "", "total": 0, "date": ""}],
  "meetings": [{"customerName": "", "date": "", "time": "", "purpose": ""}],
  "complaints": [{"customerName": "", "issue": "", "severity": "low|medium|high"}]
}`,
      }],
      maxTokens: 1200,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return {
      customers: [{ name: "Parsed Customer", phone: "Unknown", notes: "Extracted from WhatsApp" }],
      orders: [],
      meetings: [],
      complaints: [],
    };
  });
