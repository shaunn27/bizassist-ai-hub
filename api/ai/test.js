import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { DEFAULT_MODEL, ILMU_MODELS_URL, requireApiKey, readApiError } from "../_lib/ilmu.js";

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
    const requestedModel = typeof data.model === "string" ? data.model.trim() : "";

    const modelsRes = await fetch(ILMU_MODELS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!modelsRes.ok) {
      const detail = await readApiError(modelsRes);
      return sendJson(res, modelsRes.status, {
        error: `Connection test failed (${modelsRes.status}): ${detail}`,
      });
    }

    const payload = await modelsRes.json();
    const availableModels = Array.isArray(payload?.data)
      ? payload.data.map((m) => m?.id).filter((id) => typeof id === "string" && id)
      : [];
    const fallback = requestedModel || DEFAULT_MODEL;
    const selectedModel = availableModels.includes(fallback)
      ? fallback
      : (availableModels[0] || fallback);

    return sendJson(res, 200, { ok: true, selectedModel, availableModels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
