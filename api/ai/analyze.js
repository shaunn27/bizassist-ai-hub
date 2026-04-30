import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { callIlmuChat, requireApiKey, DEFAULT_MODEL } from "../_lib/ilmu.js";
import { parseAIResponse } from "../../src/utils/parseAIResponse";
import { SYSTEM_PROMPT } from "../../src/lib/systemPrompt";

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
    const formattedConversation =
      typeof data.formattedConversation === "string" ? data.formattedConversation.trim() : "";
    if (!formattedConversation) {
      return sendJson(res, 400, { error: "formattedConversation is required." });
    }

    const contextBlock = typeof data.contextBlock === "string" ? data.contextBlock.trim() : "";
    const userText = [
      contextBlock ? `## CONTEXT\n${contextBlock}` : "",
      "## TASK",
      "Analyze the conversation and return only valid JSON following the required schema.",
      "## CONVERSATION",
      formattedConversation,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await callIlmuChat({
      apiKey,
      model,
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      maxTokens: 1800,
    });

    const parsed = parseAIResponse(raw);
    if (!parsed) {
      return sendJson(res, 502, {
        error: "Model returned non-JSON analysis. Try again or adjust model.",
      });
    }

    return sendJson(res, 200, parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
