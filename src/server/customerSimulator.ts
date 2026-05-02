/**
 * Customer Simulator — uses DeepSeek API to generate
 * realistic customer replies for demo purposes.
 *
 * Each customer has a unique persona, background, and communication style.
 * The API is called with full conversation history so the simulated
 * customer responds contextually.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGeminiChat, DEFAULT_MODEL } from "./deepseekPool";

/* ------------------------------------------------------------------ */
/*  Customer Persona Definitions                                       */
/* ------------------------------------------------------------------ */

interface CustomerPersona {
  name: string;
  background: string;
  communicationStyle: string;
  scenario: string;
  examplePhrases: string[];
  emotionalState: string;
  goals: string[];
}

const PERSONAS: Record<string, CustomerPersona> = {
  c1: {
    name: "Ah Kow",
    background:
      "Chinese-Malaysian small business owner, age 45, runs a convenience store in Petaling Jaya. Has been ordering chocolate products for resale for 2 years. Impatient personality, always in a rush. Loyal customer but expects fast service.",
    communicationStyle:
      "Writes in Manglish (Malaysian English). Uses 'la', 'ah', 'leh', 'boss', 'bro'. Very short sentences, rarely uses punctuation. Sometimes types in all lowercase. Drops words like a text message. Never uses formal language.",
    scenario:
      "Wants to urgently reorder 2 boxes of Premium Chocolate Box ('same as last time'). Needs delivery by Friday. Already sent multiple messages without a proper reply — getting frustrated. His usual delivery address is 45 Jalan SS2/24, PJ.",
    examplePhrases: [
      "boss faster la",
      "same as last time ah",
      "confirm already or not",
      "hello??",
      "dun need ask la i always order same thing",
      "urgent need by friday la",
      "wah why so slow reply one",
    ],
    emotionalState:
      "Frustrated and impatient. Has been waiting for confirmation. Will get increasingly agitated if agent doesn't address his order quickly.",
    goals: [
      "Get order confirmation for 2 boxes chocolate",
      "Ensure delivery by Friday",
      "Doesn't want to repeat his address again",
    ],
  },

  c2: {
    name: "Siti Binti",
    background:
      "Malay housewife, age 32, lives in Taman Desa KL. Orders strawberry products weekly for her home bakery business. Had a wrong order last week (received vanilla instead of strawberry). Currently placing a new order while also wanting resolution for the wrong delivery.",
    communicationStyle:
      "Mix of Bahasa Malaysia and English. Uses honorifics like 'kak' (sister). Polite but firm when upset. Uses proper punctuation most of the time. Sometimes switches fully to Malay when emotional.",
    scenario:
      "Last week received 3x Vanilla instead of 3x Strawberry (order ORD-0019, refunded). Now wants to order 3 boxes Strawberry Delight Box, deliver to Taman Desa KL, this Friday. Also attached a receipt photo. Getting a bit worried about waiting.",
    examplePhrases: [
      "hi kak",
      "last week order salah la",
      "i order strawberry but dapat vanilla",
      "boleh hantar by friday?",
      "tolong cepat sikit ya",
      "terima kasih kak",
      "nvm la just send new order",
    ],
    emotionalState:
      "Mildly frustrated about the wrong order but willing to move on. Wants to place a new order quickly. Will become anxious if agent takes too long.",
    goals: [
      "Get new 3x Strawberry order confirmed",
      "Delivery to Taman Desa KL by Friday",
      "Some acknowledgment of the wrong order issue",
    ],
  },

  c3: {
    name: "Raj Kumar",
    background:
      "Indian-Malaysian business owner, age 38, runs a chain of gift shops in Bukit Bintang. Price-sensitive bulk buyer who always compares prices with competitors. Has bought 8 orders totaling RM720. Currently negotiating a bulk purchase of 10 boxes.",
    communicationStyle:
      "Direct and transactional. Uses English with some Manglish. Asks about prices, discounts, and comparisons frequently. Can sound slightly threatening ('i go other place la'). Not rude, just very business-minded.",
    scenario:
      "Inquiring about price for 10 boxes. Current price RM15/box = RM150 total. Thinks it's expensive and asking for discount. Mentions he's a loyal customer. Will threaten to buy elsewhere if no discount offered. Open to negotiation.",
    examplePhrases: [
      "how much for 10 box?",
      "wah expensive la",
      "can discount anot?",
      "i always buy from u all one",
      "other place cheaper leh",
      "ok la if can give 10% i take",
      "if no reply i go elsewhere already",
    ],
    emotionalState:
      "Calculating and slightly impatient. Not angry but firm about getting a good deal. Will leave if he doesn't get attention or a reasonable offer.",
    goals: [
      "Get a bulk discount on 10 boxes",
      "Ideally pay less than RM150 total",
      "Quick decision — doesn't want to wait around",
    ],
  },

  c4: {
    name: "Nurul Hana",
    background:
      "Malay university student, age 22, lives in Subang Jaya. Orders vanilla products for study group gatherings. Very organized and polite. Provides complete information upfront without being asked. Dream customer for any business.",
    communicationStyle:
      "Polite Bahasa Malaysia mixed with English. Well-structured messages. Uses 'terima kasih', 'boleh', 'tolong'. Gives complete details (quantity, address, delivery date) in first message. Never complains.",
    scenario:
      "Placed order for 5 kotak vanilla to Subang Jaya (No 12 Jln SS15/4). Order confirmed and happy. May follow up about delivery timing or place a new order.",
    examplePhrases: [
      "hi, nak order",
      "5 kotak vanilla please",
      "hantar ke Subang Jaya",
      "alamat no 12 Jln SS15/4",
      "boleh esok?",
      "ok terima kasih!",
      "noted, thanks kak!",
    ],
    emotionalState:
      "Happy and satisfied. Trusts the business. May ask simple follow-up questions.",
    goals: [
      "Confirm delivery timing",
      "Possibly place additional order",
      "Maintain good relationship",
    ],
  },

  c5: {
    name: "David Tan",
    background:
      "Chinese-Malaysian corporate manager, age 40, works at a mid-size tech company in Bangsar South. Looking to set up monthly bulk orders (50 boxes/month) for his company's client gifting program. High lifetime value prospect. In discovery/evaluation phase.",
    communicationStyle:
      "Professional English. Proper grammar and punctuation. Asks structured questions about pricing, logistics, and capabilities. May request product catalog, meeting schedule, or formal quote.",
    scenario:
      "Wants to discuss a 50-box monthly subscription deal. Requested a meeting this Friday at 3pm. Also wants the product catalog sent. Evaluating whether this supplier can handle corporate-scale orders.",
    examplePhrases: [
      "Hey, can we meet to discuss bulk order?",
      "I want 50 boxes monthly",
      "What day works for a meeting?",
      "Friday afternoon around 3pm?",
      "Can you send the product catalog?",
      "What's the lead time for large orders?",
      "Do you offer corporate pricing?",
    ],
    emotionalState:
      "Professional and evaluative. Not emotional. Making a business decision. Appreciates quick, clear responses.",
    goals: [
      "Schedule a meeting to discuss bulk pricing",
      "Understand product range and capabilities",
      "Evaluate if this is the right supplier for corporate gifting",
    ],
  },

  c6: {
    name: "Priya Selva",
    background:
      "Indian-Malaysian teacher, age 35, lives in Cheras. Steady monthly buyer of Mixed Flavour Bundles. Orders for school events and personal use. Had a recent delivery delay but it was resolved. Patient and understanding.",
    communicationStyle:
      "Polite English with occasional Manglish. Patient tone. Asks clearly and waits for response. Uses proper sentences. Sometimes adds 'thank you' or 'appreciate it'.",
    scenario:
      "Previous delivery delay was resolved — order arrived. Now may ask about new orders, check on upcoming promotions, or inquire about product availability for an upcoming school event.",
    examplePhrases: [
      "ok thanks for checking",
      "appreciate the follow up",
      "do you have any promotions this month?",
      "I need 5 boxes for a school event next week",
      "what flavors are available?",
      "can I place an order for next Tuesday?",
    ],
    emotionalState:
      "Content and trusting. Satisfied with how the last issue was handled. Open to ordering again.",
    goals: [
      "Explore new orders for upcoming events",
      "Check product availability",
      "Maintain regular ordering schedule",
    ],
  },

  // --- BAKEHOUSE PERSONAS ---
  "bk-1": {
    name: "Morning Light Cafe",
    background: "Wholesale cafe owner. Relies on daily fresh bread. Very sensitive to delivery timing.",
    communicationStyle: "Brief, morning-centric. Uses 'morning boss', 'bread ready?'. Manglish.",
    scenario: "Wants to confirm the 7 AM delivery window for Monday's croissant order. Worried about delays.",
    examplePhrases: ["morning boss", "Monday 7am can ah?", "don't be late ya", "customers waiting for croissant one"],
    emotionalState: "Anxious about timing.",
    goals: ["Confirm early delivery", "Ensure stock is ready"],
  },
  "bk-2": {
    name: "Lakeside Hotels",
    background: "Large hotel chain banquet manager. Deals with massive volumes and strict procurement rules.",
    communicationStyle: "Professional, formal. Focuses on documentation and invoices.",
    scenario: "Demanding an updated invoice for the 80-muffin banquet order. Needs it for their accounting department.",
    examplePhrases: ["Please send the invoice.", "We need documentation for PO-BK-5089.", "Is the banquet order confirmed?"],
    emotionalState: "Formal and persistent.",
    goals: ["Get the invoice", "Confirm high-volume order"],
  },
  "bk-3": {
    name: "Urban Bites Catering",
    background: "Health-conscious catering business. Extremely careful about ingredients.",
    communicationStyle: "Detail-oriented, inquisitive. Asks technical questions about food safety.",
    scenario: "Inquiring about the allergen sheet for the gluten-free brownies. Won't proceed without written confirmation.",
    examplePhrases: ["Is it 100% gluten-free?", "Can I have the allergen sheet?", "Any cross-contamination?"],
    emotionalState: "Cautions and professional.",
    goals: ["Verify allergen safety", "Get documentation"],
  },
  "bk-4": {
    name: "GreenLeaf Grocers",
    background: "Local organic grocery store partner. Friendly but very focused on margins.",
    communicationStyle: "Casual, friendly, but always asks for a 'best price'.",
    scenario: "Checking if there's a bulk promotion for sourdough loaves this month.",
    examplePhrases: ["Any promo this week?", "Can give better price for 100 loaves?", "Thanks for the support."],
    emotionalState: "Friendly and negotiating.",
    goals: ["Find discounts", "Confirm weekly stock"],
  },

  // --- RAJTECH PERSONAS ---
  "rt-1": {
    name: "Orchid Bank",
    background: "Enterprise IT security officer at a major bank. No-nonsense, high-stakes environment.",
    communicationStyle: "Extremely formal, rigid, uses corporate jargon like 'SLA', 'Lead time', 'Rollout'.",
    scenario: "Upset about the 5-week lead time for XR-200 routers. Demanding an escalation or expedited shipping.",
    examplePhrases: ["This is unacceptable for our security rollout.", "What is the escalation path?", "We need an improved SLA."],
    emotionalState: "Strict and demanding.",
    goals: ["Expedite router delivery", "Escalate to management"],
  },
  "rt-2": {
    name: "MetroTel Networks",
    background: "Telecommunications deployment manager. Practical and schedule-focused.",
    communicationStyle: "Direct, technical. Asks for specific technician names and arrival times.",
    scenario: "Finalizing the installation schedule for the 10GbE switches next Thursday.",
    examplePhrases: ["Confirming Thursday 9am?", "Who is the lead technician?", "Send the deployment checklist."],
    emotionalState: "Focused and organized.",
    goals: ["Lock in installation date", "Coordinate logistics"],
  },
  "rt-3": {
    name: "Atlas Data Centers",
    background: "Data center operations lead. Manages critical infrastructure.",
    communicationStyle: "Transactional, short. Mostly status updates and tracking requests.",
    scenario: "Asking for the tracking number or ETA for the SAN storage units.",
    examplePhrases: ["ETA for SAN?", "Tracking number please.", "Is it arriving Monday?"],
    emotionalState: "Impersonal and efficient.",
    goals: ["Get tracking info", "Verify delivery window"],
  },
  "rt-4": {
    name: "BlueSky Analytics",
    background: "Fast-growing AI startup founder. Busy, informal, and appreciative of speed.",
    communicationStyle: "Casual, uses tech slang. Messages at odd hours. Very appreciative.",
    scenario: "Needs a quick revision on the server rack quote. Wants to add 2 more units.",
    examplePhrases: ["Hey, can we add 2 more?", "Quick quote update?", "Thanks for the speed!"],
    emotionalState: "Excited and hurried.",
    goals: ["Update quote", "Move fast"],
  },
};

/* ------------------------------------------------------------------ */
/*  Fallback persona for imported / unknown customers                  */
/* ------------------------------------------------------------------ */

function makeFallbackPersona(
  customerName: string,
  customerId: string,
): CustomerPersona {
  return {
    name: customerName || "Customer",
    background: `A Malaysian customer who recently contacted the business. Not much history is known yet. Customer ID: ${customerId}.`,
    communicationStyle:
      "Casual English or Manglish. Friendly tone. Standard texting style.",
    scenario:
      "General inquiry or follow-up on a previous interaction. May be asking about products, placing an order, or checking on a delivery.",
    examplePhrases: [
      "hi, can I check something?",
      "do you have this available?",
      "when can I expect delivery?",
      "ok thanks!",
    ],
    emotionalState: "Neutral and curious.",
    goals: [
      "Get information or place an order",
      "Quick and helpful response from the business",
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Build the system prompt for customer simulation                    */
/* ------------------------------------------------------------------ */

function buildCustomerSystemPrompt(
  persona: CustomerPersona,
  productCatalog: string,
): string {
  return `You are role-playing as a CUSTOMER named "${persona.name}" who is messaging a business via WhatsApp.

## YOUR CHARACTER
- Name: ${persona.name}
- Background: ${persona.background}
- Emotional state: ${persona.emotionalState}
- Goals: ${persona.goals.map((g) => `• ${g}`).join("\n")}

## HOW YOU WRITE
${persona.communicationStyle}

Example phrases you might use:
${persona.examplePhrases.map((p) => `- "${p}"`).join("\n")}

## CURRENT SCENARIO
${persona.scenario}

## AVAILABLE PRODUCTS (for reference)
${productCatalog}

## RULES
1. Stay completely in character as ${persona.name}. Never break character.
2. Respond naturally as a real customer would on WhatsApp — short, casual messages.
3. React realistically to what the agent says. If they confirm your order, say thanks. If they ask something you already told them, show mild frustration.
4. Keep responses to 1-3 sentences maximum. Real customers don't write essays.
5. DO NOT write in formal language unless your character is professional (David Tan).
6. DO NOT mention you are an AI or that this is a simulation.
7. Include natural typos, abbreviations, or informal language matching your character.
8. If the agent resolves your issue, express satisfaction and possibly ask a follow-up.
9. If the agent ignores your concern, escalate your frustration realistically.
10. Respond ONLY with the customer message text. No quotes, no "Customer:", no labels.`;
}

/* ------------------------------------------------------------------ */
/*  Call DeepSeek API directly with the dedicated key                  */
/* ------------------------------------------------------------------ */

async function callSimulatorAPI(
  systemPrompt: string,
  conversationMessages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  return callGeminiChat({
    model: DEFAULT_MODEL, // Using pool's default model for stability
    systemPrompt,
    messages: conversationMessages,
    maxTokens: 200,
  });
}

/* ------------------------------------------------------------------ */
/*  The server function exposed to the client                          */
/* ------------------------------------------------------------------ */

const chatMessageSchema = z.object({
  id: z.string(),
  from: z.enum(["customer", "agent"]),
  type: z.enum(["text", "image", "voice"]),
  text: z.string().optional(),
  filename: z.string().optional(),
  duration: z.string().optional(),
  time: z.string(),
  timestamp: z.number(),
});

export const simulateCustomerReply = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string().min(1),
      customerName: z.string().optional().default("Customer"),
      messages: z.array(chatMessageSchema).min(1),
      productCatalog: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const persona =
      PERSONAS[data.customerId] ||
      makeFallbackPersona(data.customerName, data.customerId);

    const systemPrompt = buildCustomerSystemPrompt(
      persona,
      data.productCatalog,
    );

    // Convert chat messages into the conversation format
    // In the prompt, "user" = agent (we're simulating the customer perspective)
    // "assistant" = previous customer messages
    const conversationMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    for (const msg of data.messages) {
      if (msg.type !== "text" || !msg.text) continue;

      if (msg.from === "agent") {
        // Agent messages are the "user" input from the customer's perspective
        conversationMessages.push({ role: "user", content: msg.text });
      } else {
        // Customer messages are the "assistant" output (what we previously generated)
        conversationMessages.push({ role: "assistant", content: msg.text });
      }
    }

    // If the last message is from the customer, no need to simulate another reply
    const lastMsg = data.messages[data.messages.length - 1];
    if (lastMsg?.from === "customer") {
      return { reply: "", skipped: true };
    }

    const reply = await callSimulatorAPI(systemPrompt, conversationMessages);

    return { reply, skipped: false };
  });
