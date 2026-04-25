import { useCallback, useState } from "react";
import { useApp } from "@/lib/appContext";
import { type AIAnalysis } from "@/utils/parseAIResponse";
import { type ChatActionPlan } from "@/utils/chatActions";
import {
  analyzeConversation,
  chatWithAiAssistant,
  generateChatActionPlan,
  testIlmuConnection,
} from "@/server/ai.functions";

const DEFAULT_MODEL = "ilmu-glm-5.1";

export async function testAIModel(opts: {
  apiKey: string;
  model?: string;
  prompt: string;
}): Promise<string> {
  const key = opts.apiKey.trim();
  const prompt = opts.prompt.trim();
  if (!key) throw new Error("Missing API key. Add it in Settings first.");
  if (!prompt) throw new Error("Please enter text to test.");

  const result = await chatWithAiAssistant({
    data: {
      apiKey: key,
      model: opts.model?.trim() || DEFAULT_MODEL,
      contextBlock: "",
      history: [{ role: "user", content: prompt }],
    },
  });

  if (!result.reply?.trim()) {
    throw new Error("Model returned an empty response.");
  }

  return result.reply;
}

export function useAI() {
  const { settings } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveApiKey = useCallback(() => settings.apiKey.trim(), [settings.apiKey]);

  const resolveModel = useCallback(() => settings.model?.trim() || DEFAULT_MODEL, [settings.model]);

  const analyze = useCallback(
    async (formattedConversation: string, contextBlock = ""): Promise<AIAnalysis | null> => {
      setLoading(true);
      setError(null);
      try {
        return await analyzeConversation({
          data: {
            apiKey: resolveApiKey(),
            model: resolveModel(),
            formattedConversation,
            contextBlock,
          },
        });
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(error.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [resolveApiKey, resolveModel],
  );

  const chatWithAI = useCallback(
    async (
      history: { role: "user" | "assistant"; content: string }[],
      contextBlock: string,
    ): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await chatWithAiAssistant({
          data: {
            apiKey: resolveApiKey(),
            model: resolveModel(),
            contextBlock,
            history,
          },
        });
        return response.reply;
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(error.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [resolveApiKey, resolveModel],
  );

  const proposeActions = useCallback(
    async (formattedConversation: string, contextBlock = ""): Promise<ChatActionPlan | null> => {
      setLoading(true);
      setError(null);
      try {
        return await generateChatActionPlan({
          data: {
            apiKey: resolveApiKey(),
            model: resolveModel(),
            formattedConversation,
            contextBlock,
          },
        });
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(error.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [resolveApiKey, resolveModel],
  );

  const testConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await testIlmuConnection({
        data: {
          apiKey: resolveApiKey(),
          model: resolveModel(),
        },
      });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resolveApiKey, resolveModel]);

  return { analyze, chatWithAI, proposeActions, testConnection, loading, error };
}
