import { useCallback, useState } from "react";
import { useApp } from "@/lib/appContext";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { parseAIResponse, type AIAnalysis } from "@/utils/parseAIResponse";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export function getApiKey(settingsKey: string): string {
  // Settings override -> env -> empty
  if (settingsKey) return settingsKey;
  const env = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
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
    const apiKey = getApiKey(settings.apiKey);
    if (!apiKey) {
      setError("No Anthropic API key configured. Open Settings to add one.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const userText = `${contextBlock ? contextBlock + "\n\n" : ""}${formattedConversation}\n\nAnalyze the conversation above and return JSON only.`;
      const raw = await callAnthropic({
        apiKey, model: settings.model, systemPrompt: SYSTEM_PROMPT, userText,
      });
      const parsed = parseAIResponse(raw);
      if (!parsed) {
        setError("AI returned an unparseable response.");
        return null;
      }
      return parsed;
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
    const apiKey = getApiKey(settings.apiKey);
    if (!apiKey) {
      setError("No Anthropic API key configured.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 1200,
          system: `You are an AI workflow assistant helping a customer service agent. NEVER talk to the customer directly. Help the agent understand context, suggest replies, check schedules, and reason about the conversation. Use the context below.\n\n${contextBlock}`,
          messages: history.map((h) => ({ role: h.role, content: h.content })),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
      }
      const data = await res.json();
      return data?.content?.[0]?.text || "";
    } catch (e: any) {
      setError(e.message || String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  return { analyze, chatWithAI, loading, error };
}
