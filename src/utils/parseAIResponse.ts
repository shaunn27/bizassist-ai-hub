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
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    console.error("Failed to parse AI JSON:", e);
    return null;
  }
}
