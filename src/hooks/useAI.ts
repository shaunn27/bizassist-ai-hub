import { useCallback, useState } from "react";
import { useApp } from "@/lib/appContext";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { parseAIResponse, type AIAnalysis } from "@/utils/parseAIResponse";

const ANTHROPIC_URL = "https://api.ilumu.ai/v1/messages";

export function getApiKey(settingsKey: string): string {
  // Settings override -> env -> empty
  if (settingsKey) return settingsKey;
  const env = (import.meta as any).env.VITE_ANTHROPIC_API_KEY;
  return env || "";
}

async function callAnthropic(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userText }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const block = data?.content?.[0];
  return block?.text || "";
}

export function useAI() {
  const { settings } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (formattedConversation: string, contextBlock = ""): Promise<AIAnalysis | null> => {
    // Demo mode - return mock analysis without API call
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      return {
        detectedLanguage: "English",
        confidenceScore: 92,
        requestType: "Order",
        orderSummary: {
          items: ["Product"],
          quantity: "1",
          deliveryAddress: "Sample Address",
          deadline: "Today",
          specialInstructions: "None",
          missingFields: [],
        },
        confirmedDetails: ["Customer confirmed order"],
        unclearItems: [],
        flags: [],
        suggestedReply: "Thank you for your order! We'll process this right away.",
        agentChecklist: ["Confirm order details", "Send confirmation"],
        customerBehaviorNote: "Regular customer",
      };
    } catch (e: any) {
      setError(e.message || String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const chatWithAI = useCallback(async (
    history: { role: "user" | "assistant"; content: string }[],
    contextBlock: string,
  ): Promise<string | null> => {
    // Demo mode - return mock response without API call
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
      return "Based on the conversation, the customer seems satisfied with the resolution. I'd recommend sending a follow-up message to confirm everything is working properly.";
    } catch (e: any) {
      setError(e.message || String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  return { analyze, chatWithAI, loading, error };
}
