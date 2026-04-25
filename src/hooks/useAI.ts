import { useCallback, useState } from "react";
import { useApp } from "@/lib/appContext";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { callIlmuChatServer } from "@/lib/aiServer";
import { parseAIResponse, type AIAnalysis } from "@/utils/parseAIResponse";

const DEFAULT_MODEL = "ilmu-glm-5.1";

export function getApiKey(settingsKey: string): string {
  // Settings override -> env -> empty
  if (settingsKey) return settingsKey;
  const envVars = import.meta.env as Record<string, string | undefined>;
  const env = envVars.VITE_ILMU_API_KEY || envVars.VITE_ANTHROPIC_API_KEY;
  return env || "";
}

function getModel(settingsModel: string): string {
  if (settingsModel) return settingsModel;
  const envVars = import.meta.env as Record<string, string | undefined>;
  return envVars.VITE_ILMU_MODEL || envVars.VITE_AI_MODEL || DEFAULT_MODEL;
}

async function callIlmuChat(opts: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  return callIlmuChatServer({
    data: {
      apiKey: opts.apiKey,
      model: opts.model,
      messages: opts.messages,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
    },
  });
}

export async function testAIModel(opts: {
  apiKey: string;
  model?: string;
  prompt: string;
}): Promise<string> {
  const key = opts.apiKey.trim();
  if (!key) throw new Error("Missing API key. Add it in Settings first.");
  const prompt = opts.prompt.trim();
  if (!prompt) throw new Error("Please enter text to test.");

  const reply = await callIlmuChat({
    apiKey: key,
    model: getModel(opts.model || ""),
    maxTokens: 256,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  if (!reply) throw new Error("Model returned an empty response.");
  return reply;
}

export function useAI() {
  const { settings } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (formattedConversation: string, contextBlock = ""): Promise<AIAnalysis | null> => {
      setLoading(true);
      setError(null);
      try {
        const apiKey = getApiKey(settings.apiKey).trim();
        if (!apiKey) {
          throw new Error("Missing API key. Add your ilmu.ai key in Settings first.");
        }

        const userPrompt = [
          contextBlock ? `Context block:\n${contextBlock}` : "",
          `Conversation:\n${formattedConversation}`,
          "Return ONLY valid JSON that follows the schema in the system prompt.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const raw = await callIlmuChat({
          apiKey,
          model: getModel(settings.model),
          maxTokens: 1500,
          temperature: 0.1,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        });

        const parsed = parseAIResponse(raw);
        if (!parsed) {
          throw new Error("AI returned non-JSON output. Try running analysis again.");
        }
        return parsed;
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(error.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [settings.apiKey, settings.model],
  );

  const chatWithAI = useCallback(
    async (
      history: { role: "user" | "assistant"; content: string }[],
      contextBlock: string,
    ): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const apiKey = getApiKey(settings.apiKey).trim();
        if (!apiKey) {
          throw new Error("Missing API key. Add your ilmu.ai key in Settings first.");
        }

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          {
            role: "system",
            content:
              "You are an internal support copilot for agents. Give concise, practical suggestions. Never invent facts not present in context.",
          },
          {
            role: "system",
            content: `Conversation context:\n${contextBlock}`,
          },
          ...history,
        ];

        const reply = await callIlmuChat({
          apiKey,
          model: getModel(settings.model),
          maxTokens: 500,
          temperature: 0.3,
          messages,
        });

        if (!reply) {
          throw new Error("AI returned an empty response.");
        }
        return reply;
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(error.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [settings.apiKey, settings.model],
  );

  return { analyze, chatWithAI, loading, error };
}
