import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MODEL, requireApiKey, callDeepSeekChat } from "./ai.functions.shared";

export const generateInvoice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      apiKey: z.string().optional().default(""),
      model: z.string().optional(),
      invoiceData: z.object({
        orderId: z.string(),
        customerName: z.string(),
        customerPhone: z.string().optional(),
        items: z.string(),
        total: z.number(),
        businessName: z.string(),
        businessAddress: z.string().optional(),
        date: z.string(),
        status: z.string(),
        source: z.string().optional(),
        chatExcerpt: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = requireApiKey(data.apiKey);
    const inv = data.invoiceData;
    const raw = await callDeepSeekChat({
      apiKey,
      model: data.model || DEFAULT_MODEL,
      systemPrompt: `You are a professional invoice generator AI for a Malaysian SME. Generate a clean, professional invoice in structured JSON format. All amounts in RM. Be precise with calculations.`,
      messages: [{ role: "user", content: `Generate a professional invoice for:

Order: ${inv.orderId}
Customer: ${inv.customerName}${inv.customerPhone ? `, Phone: ${inv.customerPhone}` : ""}
Items ordered: ${inv.items}
Total: RM${inv.total}
Date: ${inv.date}
Status: ${inv.status}
Business: ${inv.businessName}${inv.businessAddress ? `, ${inv.businessAddress}` : ""}
Source: ${inv.source || "WhatsApp"}${inv.chatExcerpt ? `\nContext: ${inv.chatExcerpt}` : ""}

Parse the items string into individual line items with quantities, unit prices, and subtotals. Add standard Malaysian tax (SST 8% if applicable, or 0% for exempt items). Include a professional footer with payment terms.

Return JSON:
{
  "invoiceNumber": "INV-XXXXX",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD (Net 30)",
  "seller": { "name": "business name", "address": "address" },
  "buyer": { "name": "customer name", "phone": "phone" },
  "lineItems": [{ "description": "item name", "quantity": number, "unitPrice": number, "subtotal": number }],
  "subtotal": number,
  "tax": number,
  "taxRate": "8% or 0%",
  "total": number,
  "paymentTerms": "Net 30 days",
  "notes": "Thank you for your business",
  "footerMessage": "professional footer text"
}` }],
      maxTokens: 800,
    });
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
    } catch { /* fallback */ }
    return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: inv.date,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      seller: { name: inv.businessName, address: inv.businessAddress || "Kuala Lumpur, Malaysia" },
      buyer: { name: inv.customerName, phone: inv.customerPhone || "" },
      lineItems: [{ description: inv.items, quantity: 1, unitPrice: inv.total, subtotal: inv.total }],
      subtotal: inv.total,
      tax: Math.round(inv.total * 0.08 * 100) / 100,
      taxRate: "8%",
      total: Math.round(inv.total * 1.08 * 100) / 100,
      paymentTerms: "Net 30 days",
      notes: "Thank you for your business!",
      footerMessage: "This is a computer-generated invoice.",
    };
  });
