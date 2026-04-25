import { z } from "zod";

export type ChatActionKind = "order" | "meeting" | "refund" | "escalation" | "inventory";

export type ActionProposal = {
  id: string;
  kind: ChatActionKind;
  title: string;
  summary: string;
  confidence: number;
  rationale: string;
  missingFields: string[];
  orderDraft?: {
    items: string[];
    source: "WhatsApp" | "Website" | "Phone";
    total: number | null;
    note?: string;
  };
  meetingDraft?: {
    purpose: string;
    date: string;
    time: string;
    duration: string;
  };
  refundDraft?: {
    reason: string;
    amount: number | null;
  };
  escalationDraft?: {
    reason: string;
    assigneeHint?: string;
  };
  inventoryDraft?: {
    skuHints: string[];
    quantity: number | null;
  };
};

export type ChatActionPlan = {
  proposals: ActionProposal[];
};

const actionProposalSchema: z.ZodType<ActionProposal> = z.object({
  id: z.string(),
  kind: z.enum(["order", "meeting", "refund", "escalation", "inventory"]),
  title: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(100),
  rationale: z.string(),
  missingFields: z.array(z.string()),
  orderDraft: z
    .object({
      items: z.array(z.string()),
      source: z.enum(["WhatsApp", "Website", "Phone"]),
      total: z.number().nullable(),
      note: z.string().optional(),
    })
    .optional(),
  meetingDraft: z
    .object({
      purpose: z.string(),
      date: z.string(),
      time: z.string(),
      duration: z.string(),
    })
    .optional(),
  refundDraft: z
    .object({
      reason: z.string(),
      amount: z.number().nullable(),
    })
    .optional(),
  escalationDraft: z
    .object({
      reason: z.string(),
      assigneeHint: z.string().optional(),
    })
    .optional(),
  inventoryDraft: z
    .object({
      skuHints: z.array(z.string()),
      quantity: z.number().nullable(),
    })
    .optional(),
});

const actionPlanSchema: z.ZodType<ChatActionPlan> = z.object({
  proposals: z.array(actionProposalSchema),
});

export function parseChatActionPlan(raw: string): ChatActionPlan | null {
  if (!raw) return null;

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const result = actionPlanSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    console.error("Failed to parse AI action plan:", error);
    return null;
  }
}