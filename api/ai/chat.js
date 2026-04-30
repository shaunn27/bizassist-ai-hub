import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { callIlmuChat, requireApiKey, DEFAULT_MODEL } from "../_lib/ilmu.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  let data = {};
  try {
    data = await readJson(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON body.";
    return sendJson(res, 400, { error: message });
  }

  try {
    const apiKey = requireApiKey(data.apiKey || "");
    const model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : DEFAULT_MODEL;
    const history = Array.isArray(data.history) ? data.history : [];

    if (history.length === 0) {
      return sendJson(res, 400, { error: "history is required." });
    }

    const contextBlock = typeof data.contextBlock === "string" ? data.contextBlock.trim() : "";
    const bootstrap = contextBlock
      ? [
          {
            role: "user",
            content: `Use this context when assisting the support agent.\n\n${contextBlock}`,
          },
        ]
      : [];

    const reply = await callIlmuChat({
      apiKey,
      model,
      systemPrompt:
        "You are an assistant for customer support agents. Be concise, practical, and action-oriented.",
      messages: [...bootstrap, ...history],
      maxTokens: 1000,
    });

    if (!reply) {
      return sendJson(res, 502, { error: "Model returned an empty response." });
    }

    return sendJson(res, 200, { reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
