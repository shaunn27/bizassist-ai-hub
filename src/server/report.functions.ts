import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callDeepSeekChat, requireApiKey } from "./ai.functions.shared";

export const generateBusinessReport = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      reportData: z.object({
        businessName: z.string(),
        period: z.string(),
        totalOrders: z.number(),
        totalRevenue: z.number(),
        pendingOrders: z.number(),
        completedOrders: z.number(),
        topProducts: z.array(z.object({ name: z.string(), quantity: z.number(), revenue: z.number() })),
        topCustomers: z.array(z.object({ name: z.string(), orders: z.number(), spent: z.number() })),
        openChats: z.number(),
        resolvedChats: z.number(),
        avgResponseTime: z.string(),
        sentimentBreakdown: z.object({ positive: z.number(), neutral: z.number(), negative: z.number() }),
        meetingsHeld: z.number(),
        upcomingMeetings: z.number(),
        lowStockItems: z.array(z.object({ name: z.string(), stock: z.number() })),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const DEFAULT_MODEL = "deepseek-v4-flash";
    const rd = data.reportData;
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a professional business analyst AI. Generate a detailed, professional business performance report for a Malaysian SME. Use RM currency. Be specific with numbers and actionable recommendations. Write in clear, professional English. Structure the report with clear sections.`,
      messages: [{ role: "user", content: `Generate a comprehensive business report for "${rd.businessName}" for the period: ${rd.period}.

Key metrics to analyze:
- Orders: ${rd.totalOrders} total (${rd.pendingOrders} pending, ${rd.completedOrders} completed)
- Revenue: RM${rd.totalRevenue.toLocaleString()}
- Customer chats: ${rd.openChats} open, ${rd.resolvedChats} resolved
- Average response time: ${rd.avgResponseTime}
- Sentiment: ${rd.sentimentBreakdown.positive} positive, ${rd.sentimentBreakdown.neutral} neutral, ${rd.sentimentBreakdown.negative} negative
- Meetings: ${rd.meetingsHeld} held, ${rd.upcomingMeetings} upcoming
- Low stock items: ${rd.lowStockItems.map(i => `${i.name} (${i.stock} left)`).join(", ") || "None"}

Top products: ${rd.topProducts.map(p => `${p.name} — ${p.quantity} sold, RM${p.revenue}`).join("; ")}
Top customers: ${rd.topCustomers.map(c => `${c.name} — ${c.orders} orders, RM${c.spent}`).join("; ")}

Return JSON with this exact structure:
{
  "title": "Business Performance Report",
  "executiveSummary": "2-3 sentence overview",
  "sections": [
    { "heading": "Revenue & Orders", "content": "detailed analysis", "highlights": ["key point 1", "key point 2"] },
    { "heading": "Customer Engagement", "content": "detailed analysis", "highlights": [] },
    { "heading": "Product Performance", "content": "detailed analysis", "highlights": [] },
    { "heading": "Inventory & Supply Chain", "content": "detailed analysis", "highlights": [] },
    { "heading": "Recommendations", "content": "3-5 specific actionable recommendations", "highlights": [] }
  ],
  "overallScore": 1-100,
  "riskLevel": "low|medium|high",
  "generatedAt": "current date"
}` }],
      maxTokens: 1500,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return {
      title: "Business Performance Report",
      executiveSummary: `Revenue of RM${rd.totalRevenue.toLocaleString()} across ${rd.totalOrders} orders. ${rd.pendingOrders} orders pending.`,
      sections: [
        { heading: "Revenue & Orders", content: `Total revenue RM${rd.totalRevenue.toLocaleString()} with ${rd.totalOrders} orders.`, highlights: [`${rd.completedOrders} orders completed`] },
        { heading: "Customer Engagement", content: `${rd.openChats} active conversations, ${rd.resolvedChats} resolved.`, highlights: [] },
        { heading: "Recommendations", content: "Focus on clearing pending orders and restocking low inventory items.", highlights: [] },
      ],
      overallScore: 70,
      riskLevel: "medium",
      generatedAt: new Date().toISOString().split("T")[0],
    };
  });
