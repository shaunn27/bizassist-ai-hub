import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const generateHealthPulse = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      metrics: z.object({
        totalRevenue: z.number(),
        pendingOrders: z.number(),
        completedOrders: z.number(),
        totalOrders: z.number(),
        openChats: z.number(),
        avgResponseTime: z.number(),
        unresolvedFlags: z.number(),
        lowStockProducts: z.number(),
        totalProducts: z.number(),
        customerCount: z.number(),
        activeCustomersCount: z.number(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const m = data.metrics;
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a business health analyst AI for a Malaysian SME. Analyze the provided metrics and compute an overall health score (0-100) with component breakdowns. Be specific and actionable. Return ONLY valid JSON.`,
      messages: [{
        role: "user",
        content: `Analyze these business metrics and return a health score:
- Revenue: RM${m.totalRevenue.toLocaleString()}
- Orders: ${m.totalOrders} total (${m.pendingOrders} pending, ${m.completedOrders} completed)
- Open chats: ${m.openChats}
- Avg response time: ${m.avgResponseTime} min
- Unresolved flags: ${m.unresolvedFlags}
- Low stock products: ${m.lowStockProducts}/${m.totalProducts}
- Customers: ${m.activeCustomersCount} active of ${m.customerCount}

Return JSON:
{
  "score": 0-100,
  "trend": "improving|stable|declining",
  "components": [
    { "name": "Revenue", "score": 0-100, "weight": 30, "status": "good|warning|critical" },
    { "name": "Response Time", "score": 0-100, "weight": 20, "status": "good|warning|critical" },
    { "name": "Inventory", "score": 0-100, "weight": 20, "status": "good|warning|critical" },
    { "name": "Customer Health", "score": 0-100, "weight": 15, "status": "good|warning|critical" },
    { "name": "Operations", "score": 0-100, "weight": 15, "status": "good|warning|critical" }
  ],
  "alertMessage": "one sentence summary",
  "recommendedAction": "one actionable sentence"
}`
      }],
      maxTokens: 600,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    const completionRate = m.totalOrders > 0 ? (m.completedOrders / m.totalOrders) * 100 : 50;
    const stockHealth = m.totalProducts > 0 ? ((m.totalProducts - m.lowStockProducts) / m.totalProducts) * 100 : 80;
    const score = Math.round((completionRate * 0.3) + ((100 - Math.min(m.avgResponseTime * 5, 100)) * 0.2) + (stockHealth * 0.2) + ((m.activeCustomersCount / Math.max(m.customerCount, 1)) * 100 * 0.15) + (Math.max(0, 100 - m.unresolvedFlags * 10) * 0.15));
    return {
      score,
      trend: score >= 65 ? "improving" : score >= 40 ? "stable" : "declining",
      components: [
        { name: "Revenue", score: Math.round(completionRate), weight: 30, status: completionRate >= 70 ? "good" as const : completionRate >= 40 ? "warning" as const : "critical" as const },
        { name: "Response Time", score: Math.round(100 - Math.min(m.avgResponseTime * 5, 100)), weight: 20, status: m.avgResponseTime <= 5 ? "good" as const : m.avgResponseTime <= 15 ? "warning" as const : "critical" as const },
        { name: "Inventory", score: Math.round(stockHealth), weight: 20, status: stockHealth >= 80 ? "good" as const : stockHealth >= 50 ? "warning" as const : "critical" as const },
        { name: "Customer Health", score: Math.round((m.activeCustomersCount / Math.max(m.customerCount, 1)) * 100), weight: 15, status: "good" as const },
        { name: "Operations", score: Math.round(Math.max(0, 100 - m.unresolvedFlags * 10)), weight: 15, status: m.unresolvedFlags <= 2 ? "good" as const : m.unresolvedFlags <= 5 ? "warning" as const : "critical" as const },
      ],
      alertMessage: `Business health score: ${score}/100. ${m.pendingOrders} pending orders need attention.`,
      recommendedAction: score >= 70 ? "Business is healthy. Focus on growth opportunities." : score >= 40 ? "Address pending orders and improve response times." : "Urgent: Multiple areas need immediate attention.",
    };
  });
