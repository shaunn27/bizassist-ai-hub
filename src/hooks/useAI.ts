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
import { generateBusinessReport } from "@/server/report.functions";
import { generateInvoice } from "@/server/invoice.functions";
import { chatCopilot } from "@/server/copilot.functions";
import { parseWhatsAppChat } from "@/server/chatParser.functions";
import { generateForecast } from "@/server/forecast.functions";
import { generateCompetitorIntel } from "@/server/intelligence.functions";
import { generateCustomer360 } from "@/server/customer360.functions";

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

  const getBusinessReport = useCallback(
    async (reportData: any): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await generateBusinessReport({ data: { apiKey: resolveApiKey(), model: resolveModel(), reportData } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); throw err; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const getInvoice = useCallback(
    async (invoiceData: any): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await generateInvoice({ data: { apiKey: resolveApiKey(), model: resolveModel(), invoiceData } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); throw err; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const chatCopilotFn = useCallback(
    async (question: string, history: { role: "user" | "assistant"; content: string }[]): Promise<{ reply: string; chartData: any } | null> => {
      setLoading(true); setError(null);
      try {
        return await chatCopilot({ data: { apiKey: resolveApiKey(), model: resolveModel(), question, businessName: "BizAssist", history } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const parseWhatsApp = useCallback(
    async (rawText: string): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await parseWhatsAppChat({ data: { apiKey: resolveApiKey(), model: resolveModel(), rawText } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const getForecast = useCallback(
    async (forecastDays: number): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        const now = new Date();
        const historicalOrders = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          historicalOrders.push({
            date: d.toISOString().slice(0, 10),
            total: Math.round(300 + Math.random() * 700),
            orderCount: Math.round(3 + Math.random() * 8),
          });
        }
        return await generateForecast({ data: { apiKey: resolveApiKey(), model: resolveModel(), historicalOrders, forecastDays, businessName: "BizAssist" } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const getCompetitorIntel = useCallback(
    async (competitorInfo: string): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await generateCompetitorIntel({ data: { apiKey: resolveApiKey(), model: resolveModel(), competitorInfo, ownBusiness: { name: "BizAssist", products: ["Widget A", "Widget B"], totalOrders: 150, totalRevenue: 25000, customerCount: 80 } } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
    },
    [resolveApiKey, resolveModel],
  );

  const getCustomer360 = useCallback(
    async (customerData: any): Promise<any | null> => {
      setLoading(true); setError(null);
      try {
        return await generateCustomer360({ data: { apiKey: resolveApiKey(), model: resolveModel(), customerData } });
      } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e)); setError(err.message); return null; }
      finally { setLoading(false); }
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
    getBusinessReport,
    getInvoice,
    chatCopilot: chatCopilotFn,
    parseWhatsApp,
    getForecast,
    getCompetitorIntel,
    getCustomer360,
    loading,
    error,
  };
}
