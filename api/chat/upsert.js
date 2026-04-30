import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { getSupabaseServerClient, isSupabaseConfigured } from "../../src/server/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  if (!isSupabaseConfigured()) {
    return sendJson(res, 200, { configured: false, ok: false });
  }

  let data = {};
  try {
    data = await readJson(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON body.";
    return sendJson(res, 400, { error: message });
  }

  if (!data.thread || !data.thread.customerId) {
    return sendJson(res, 400, { error: "thread is required." });
  }

  try {
    const t = data.thread;
    const supabase = getSupabaseServerClient();

    const payload = {
      customer_id: t.customerId,
      customer_name: t.customerName ?? null,
      customer_phone: t.customerPhone ?? null,
      customer_avatar_color: t.customerAvatarColor ?? null,
      customer_initials: t.customerInitials ?? null,
      source: t.source ?? "supabase",
      flagged: t.flagged,
      unread: t.unread,
      status: t.status,
      waiting_minutes: t.waitingMinutes,
      last_message_preview: t.lastMessagePreview,
      messages: t.messages,
    };

    const { error } = await supabase.from("chat_threads").upsert(payload, {
      onConflict: "customer_id",
    });

    if (error) {
      return sendJson(res, 500, { error: `Failed to save chat to Supabase: ${error.message}` });
    }

    return sendJson(res, 200, { configured: true, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
