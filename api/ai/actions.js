import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { callIlmuChat, requireApiKey, DEFAULT_MODEL } from "../_lib/ilmu.js";
import { parseChatActionPlan } from "../../src/utils/chatActions";

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
      "Analyze the conversation and return only valid JSON with a proposals array.",
      "For each proposal include id, kind, title, summary, confidence, rationale, missingFields, and any draft payload.",
      "Allowed kinds: order, meeting, refund, escalation, inventory.",
      "For meeting proposals include a concrete date (YYYY-MM-DD), time, duration, and purpose.",
      "For order proposals include items as an array and a total when it can be inferred.",
      "Prefer proposals that an operator can confirm with one click.",
      "## CONVERSATION",
      formattedConversation,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await callIlmuChat({
      apiKey,
      model,
      systemPrompt:
        "You transform support conversations into structured operational action proposals. Return only JSON.",
      messages: [{ role: "user", content: userText }],
      maxTokens: 1800,
    });

    const parsed = parseChatActionPlan(raw);
    if (!parsed) {
      return sendJson(res, 502, {
        error: "Model returned invalid action plan JSON. Try again or adjust model.",
      });
    }

    return sendJson(res, 200, parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
