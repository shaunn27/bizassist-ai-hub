import { sendJson, methodNotAllowed } from "../_utils.js";
import { getSupabaseServerClient, isSupabaseConfigured } from "../../src/server/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  if (!isSupabaseConfigured()) {
    return sendJson(res, 200, { configured: false, chats: [] });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("chat_threads")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return sendJson(res, 500, { error: `Failed to load chats from Supabase: ${error.message}` });
    }

    const chats = (data || []).map((row) => ({
      customerId: row.customer_id,
      customerName: row.customer_name || undefined,
      customerPhone: row.customer_phone || undefined,
      customerAvatarColor: row.customer_avatar_color || undefined,
      customerInitials: row.customer_initials || undefined,
      source: row.source || "supabase",
      flagged: row.flagged ?? null,
      unread: row.unread ?? 0,
      status: row.status || "open",
      waitingMinutes: row.waiting_minutes ?? 0,
      lastMessagePreview: row.last_message_preview || "",
      messages: Array.isArray(row.messages) ? row.messages : [],
    }));

    return sendJson(res, 200, { configured: true, chats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
