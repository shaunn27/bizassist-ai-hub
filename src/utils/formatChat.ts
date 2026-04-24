import type { ChatMessage } from "@/data/mockChats";
import type { Customer } from "@/data/mockCustomers";

export function formatChatForAI(messages: ChatMessage[], customer: Customer | undefined): string {
  const lines = messages.map((m) => {
    const role = m.from === "customer" ? "CUSTOMER" : "AGENT";
    let content = "";
    if (m.type === "text") content = m.text || "";
    else if (m.type === "image") content = `[image: ${m.filename}]`;
    else if (m.type === "voice") content = `[voice note ${m.duration}]`;
    return `[${m.time}] ${role}: ${content}`;
  });
  let header = "";
  if (customer) {
    header = `## CUSTOMER PROFILE
Name: ${customer.name}
Phone: ${customer.phone}
Loyal since: ${customer.loyalSince}
Total orders: ${customer.totalOrders} (RM${customer.totalSpent} lifetime)
Preferred products: ${customer.preferredProducts.join(", ")}
Behavior note: ${customer.behaviorSummary}
Recent orders: ${customer.orderHistory
      .slice(0, 3)
      .map((o) => `${o.id} ${o.items} RM${o.amount}`)
      .join("; ")}

## CONVERSATION
`;
  }
  return header + lines.join("\n");
}

export function buildContextBlock(opts: {
  customer?: Customer;
  productCatalog?: string;
  meetingsToday?: string;
}): string {
  const parts: string[] = [];
  if (opts.productCatalog) parts.push(`## PRODUCT CATALOG\n${opts.productCatalog}`);
  if (opts.meetingsToday) parts.push(`## CURRENT MEETING SCHEDULE\n${opts.meetingsToday}`);
  return parts.join("\n\n");
}
