import { useCallback, useState } from "react";
import { useApp } from "@/lib/appContext";
import { type ChatActionPlan } from "@/utils/chatActions";
import {
  analyzeConversation,
  analyzeSentiment,
  chatWithAiAssistant,
  generateChatActionPlan,
  generateSmartReplies,
  testConnection as testConnectionFn,
  generateConversationSummary,
  detectOrderIntent,
  scoreConversationPriority,
  generateAutoPilotReply,
  generateDailyBriefing,
} from "@/server/ai.functions";

const DEFAULT_MODEL = "deepseek-v4-flash";

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
    async (formattedConversation: string, contextBlock = ""): Promise<string | null> => {
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
      return await testConnectionFn({
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

  const getSmartReplies = useCallback(
    async (formattedConversation: string): Promise<string[]> => {
      try {
        const result = await generateSmartReplies({
          data: {
            apiKey: resolveApiKey(),
            model: resolveModel(),
            formattedConversation,
          },
        });
        return result.replies;
      } catch {
        return [];
      }
    },
    [resolveApiKey, resolveModel],
  );

  const getSentiment = useCallback(
    async (lastMessages: string): Promise<{ sentiment: string; emoji: string } | null> => {
      try {
        return await analyzeSentiment({
          data: {
            apiKey: resolveApiKey(),
            model: resolveModel(),
            lastMessages,
          },
        });
      } catch {
        return null;
      }
    },
    [resolveApiKey, resolveModel],
  );

  const summarizeConversation = useCallback(
    async (formattedConversation: string, customerProfile: string): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await generateConversationSummary({
          data: { apiKey: resolveApiKey(), model: resolveModel(), formattedConversation, customerProfile },
        });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const detectOrder = useCallback(
    async (formattedConversation: string, productCatalog: string): Promise<any | null> => {
      try {
        return await detectOrderIntent({
          data: { apiKey: resolveApiKey(), model: resolveModel(), formattedConversation, productCatalog },
        });
      } catch { return null; }
    },
    [resolveApiKey, resolveModel],
  );

  const scorePriority = useCallback(
    async (conversations: Array<{ customerId: string; customerName?: string; lastMessagePreview: string; waitingMinutes: number; unread: number; flagged: "critical" | "warning" | "info" | null; sentiment?: string }>): Promise<Array<{ customerId: string; score: number; reason: string }> | null> => {
      try {
        const result = await scoreConversationPriority({
          data: { apiKey: resolveApiKey(), model: resolveModel(), conversations },
        });
        return result.scores;
      } catch { return null; }
    },
    [resolveApiKey, resolveModel],
  );

  const autoPilotReply = useCallback(
    async (formattedConversation: string, productCatalog: string): Promise<{ reply: string; autoAction: any } | null> => {
      try {
        return await generateAutoPilotReply({
          data: { apiKey: resolveApiKey(), model: resolveModel(), formattedConversation, productCatalog },
        });
      } catch { return null; }
    },
    [resolveApiKey, resolveModel],
  );

  const getDailyBriefing = useCallback(
    async (dashboardData: any): Promise<any | null> => {
      try {
        return await generateDailyBriefing({
          data: { apiKey: resolveApiKey(), model: resolveModel(), dashboardData },
        });
      } catch { return null; }
    },
    [resolveApiKey, resolveModel],
  );

  return {
    analyze,
    chatWithAI,
    proposeActions,
    testConnection,
    getSmartReplies,
    getSentiment,
    summarizeConversation,
    detectOrder,
    scorePriority,
    autoPilotReply,
    getDailyBriefing,
    loading,
    error,
  };
}
