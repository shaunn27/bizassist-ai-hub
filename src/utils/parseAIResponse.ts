import { z } from "zod";

export type AIAnalysis = {
  detectedLanguage: string;
  confidenceScore: number;
  requestType: string;
  orderSummary: {
    items: string[];
    quantity: string | null;
    deliveryAddress: string | null;
    deadline: string | null;
    specialInstructions: string | null;
    missingFields: string[];
  };
  confirmedDetails: string[];
  unclearItems: { issue: string; whyItMatters: string; whatToAsk: string }[];
  flags: { severity: "critical" | "warning" | "info"; type: string; description: string }[];
  suggestedReply: string;
  agentChecklist: string[];
  customerBehaviorNote: string;
};

const aiAnalysisSchema: z.ZodType<AIAnalysis> = z.object({
  detectedLanguage: z.string(),
  confidenceScore: z.number().min(0).max(100),
  requestType: z.string(),
  orderSummary: z.object({
    items: z.array(z.string()),
    quantity: z.string().nullable(),
    deliveryAddress: z.string().nullable(),
    deadline: z.string().nullable(),
    specialInstructions: z.string().nullable(),
    missingFields: z.array(z.string()),
  }),
  confirmedDetails: z.array(z.string()),
  unclearItems: z.array(
    z.object({
      issue: z.string(),
      whyItMatters: z.string(),
      whatToAsk: z.string(),
    }),
  ),
  flags: z.array(
    z.object({
      severity: z.enum(["critical", "warning", "info"]),
      type: z.string(),
      description: z.string(),
    }),
  ),
  suggestedReply: z.string(),
  agentChecklist: z.array(z.string()),
  customerBehaviorNote: z.string(),
});

export function parseAIResponse(raw: string): AIAnalysis | null {
  if (!raw) return null;
  // Strip markdown fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // Find first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const result = aiAnalysisSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (e) {
    console.error("Failed to parse AI JSON:", e);
    return null;
  }
}
