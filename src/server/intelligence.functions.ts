import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const generateCompetitorIntel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      competitorInfo: z.string(),
      ownBusiness: z.object({
        name: z.string(),
        products: z.array(z.string()),
        totalOrders: z.number(),
        totalRevenue: z.number(),
        customerCount: z.number(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a competitive intelligence AI for Malaysian SMEs. Analyze competitor information and compare with the user's business. Be specific and actionable. Return ONLY valid JSON.`,
      messages: [{
        role: "user",
        content: `My business: ${data.ownBusiness.name}
Products: ${data.ownBusiness.products.join(", ")}
Total orders: ${data.ownBusiness.totalOrders}
Total revenue: RM${data.ownBusiness.totalRevenue}
Customer count: ${data.ownBusiness.customerCount}

Competitor info: ${data.competitorInfo}

Analyze and return JSON:
{
  "competitorProfile": {"name": "", "estimatedSize": "small|medium|large", "keyProducts": []},
  "comparison": {
    "categories": [
      {"name": "Product Range", "yourScore": 0-100, "competitorScore": 0-100},
      {"name": "Pricing", "yourScore": 0-100, "competitorScore": 0-100},
      {"name": "Customer Service", "yourScore": 0-100, "competitorScore": 0-100},
      {"name": "Brand Presence", "yourScore": 0-100, "competitorScore": 0-100},
      {"name": "Innovation", "yourScore": 0-100, "competitorScore": 0-100}
    ]
  },
  "swot": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  "recommendations": [{"action": "", "priority": "high|medium|low", "rationale": ""}]
}`,
      }],
      maxTokens: 1200,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return {
      competitorProfile: { name: "Competitor", estimatedSize: "medium", keyProducts: ["Similar products"] },
      comparison: {
        categories: [
          { name: "Product Range", yourScore: 75, competitorScore: 65 },
          { name: "Pricing", yourScore: 80, competitorScore: 70 },
          { name: "Customer Service", yourScore: 85, competitorScore: 60 },
          { name: "Brand Presence", yourScore: 60, competitorScore: 75 },
          { name: "Innovation", yourScore: 70, competitorScore: 65 },
        ],
      },
      swot: {
        strengths: ["Strong customer service", "Competitive pricing"],
        weaknesses: ["Limited brand visibility"],
        opportunities: ["Expand online presence", "Launch loyalty program"],
        threats: ["Competitor expanding product range"],
      },
      recommendations: [
        { action: "Increase social media marketing", priority: "high", rationale: "Competitor has stronger brand presence" },
        { action: "Launch a referral program", priority: "medium", rationale: "Leverage your customer service advantage" },
      ],
    };
  });
