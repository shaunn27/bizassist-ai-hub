import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const generateCustomer360 = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      customerData: z.object({
        name: z.string(),
        phone: z.string(),
        totalOrders: z.number(),
        totalSpent: z.number(),
        preferredProducts: z.array(z.string()),
        behaviorSummary: z.string(),
        orderHistory: z.array(z.object({ id: z.string(), items: z.string(), amount: z.number() })),
        status: z.string(),
        loyalSince: z.string(),
      }),
      recentChatMessages: z.array(z.object({ from: z.string(), text: z.string(), time: z.string() })).optional().default([]),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const c = data.customerData;
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a customer intelligence AI for Malaysian SMEs. Generate deep customer profiles with personality analysis, churn risk, and actionable recommendations. Return ONLY valid JSON.`,
      messages: [{
        role: "user",
        content: `Customer profile:
- Name: ${c.name}
- Phone: ${c.phone}
- Total orders: ${c.totalOrders}
- Total spent: RM${c.totalSpent}
- Preferred products: ${c.preferredProducts.join(", ")}
- Behavior: ${c.behaviorSummary}
- Status: ${c.status}
- Loyal since: ${c.loyalSince}
- Recent chats: ${data.recentChatMessages.map((m) => `[${m.from}] ${m.text}`).join(" | ") || "No recent chats"}
- Order history: ${c.orderHistory.map((o) => `${o.items} RM${o.amount}`).join(", ")}

Generate 360 profile. Return JSON:
{
  "personality": "one word",
  "personalityDescription": "one sentence",
  "churnRisk": "low|medium|high|critical",
  "churnReason": "one sentence",
  "predictedLTV": 0,
  "bestContactTime": "e.g. 2-4 PM",
  "communicationStyle": "one sentence",
  "recommendedActions": [{"action": "", "priority": "high|medium|low", "expectedImpact": ""}],
  "purchasePattern": "one sentence",
  "sentimentTrend": [{"date": "YYYY-MM-DD", "score": 0-100}],
  "nextBestOffer": "product name and reason",
  "vipPotential": 0-100
}`,
      }],
      maxTokens: 900,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    const churnRisk = c.status === "Active" && c.totalOrders > 5 ? "low" : c.status === "Active" ? "medium" : "high";
    return {
      personality: c.totalOrders > 8 ? "Loyalist" : c.totalOrders > 3 ? "Regular" : "Explorer",
      personalityDescription: `${c.name} is a ${c.status.toLowerCase()} customer with ${c.totalOrders} orders totaling RM${c.totalSpent}.`,
      churnRisk,
      churnReason: churnRisk === "low" ? "Highly engaged customer" : "Activity declining",
      predictedLTV: Math.round(c.totalSpent * 2.5),
      bestContactTime: "2-4 PM",
      communicationStyle: "Friendly and direct",
      recommendedActions: [
        { action: `Offer exclusive deal on ${c.preferredProducts[0] || "popular items"}`, priority: "high", expectedImpact: "+15% repeat purchase" },
        { action: "Send personalized thank-you message", priority: "medium", expectedImpact: "Improved loyalty" },
      ],
      purchasePattern: `Orders ${c.preferredProducts.slice(0, 2).join(" and ")} regularly`,
      sentimentTrend: [
        { date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), score: 75 },
        { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), score: 80 },
        { date: new Date().toISOString().slice(0, 10), score: 85 },
      ],
      nextBestOffer: `${c.preferredProducts[0] || "Best seller"} bundle at 10% off`,
      vipPotential: Math.min(100, c.totalOrders * 10 + Math.round(c.totalSpent / 10)),
    };
  });
