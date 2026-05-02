import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ChatThread } from "@/data/mockChats";
import {
  getSupabaseServerClient,
  isSupabaseConfigured,
  type Database,
  type Json,
} from "@/server/supabase";

const chatMessageSchema = z.object({
  id: z.string(),
  from: z.enum(["customer", "agent"]),
  side: z.enum(["left", "right"]).optional(),
  type: z.enum(["text", "image", "voice"]),
  text: z.string().optional(),
  filename: z.string().optional(),
  duration: z.string().optional(),
  time: z.string(),
  timestamp: z.number(),
});

const chatThreadSchema: z.ZodType<ChatThread> = z.object({
  customerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAvatarColor: z.string().optional(),
  customerInitials: z.string().optional(),
  source: z.enum(["seed", "whatsapp-import", "supabase"]).optional(),
  flagged: z.enum(["critical", "warning", "info"]).nullable(),
  unread: z.number().int().nonnegative(),
  status: z.enum(["open", "resolved"]),
  waitingMinutes: z.number().int().nonnegative(),
  lastMessagePreview: z.string(),
  messages: z.array(chatMessageSchema),
});

type PersistedChatRow = Database["public"]["Tables"]["chat_threads"]["Row"];

function toThread(row: PersistedChatRow): ChatThread | null {
  const result = chatThreadSchema.safeParse({
    customerId: row.customer_id,
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || undefined,
    customerAvatarColor: row.customer_avatar_color || undefined,
    customerInitials: row.customer_initials || undefined,
    source: row.source || "supabase",
    flagged: row.flagged,
    unread: row.unread ?? 0,
    status: row.status || "open",
    waitingMinutes: row.waiting_minutes ?? 0,
    lastMessagePreview: row.last_message_preview || "",
    messages: Array.isArray(row.messages) ? row.messages : [],
  });

  return result.success ? result.data : null;
}

export const listPersistedChats = createServerFn({ method: "GET" }).handler(async () => {
  if (!isSupabaseConfigured()) {
    return { configured: false, chats: [] as ChatThread[] };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load chats from Supabase: ${error.message}`);
  }

  const chats = (data || [])
    .map((row: PersistedChatRow) => toThread(row))
    .filter((row): row is ChatThread => !!row);

  return {
    configured: true,
    chats,
  };
});

export const upsertPersistedChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      thread: chatThreadSchema,
    }),
  )
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) {
      return { configured: false, ok: false };
    }

    const t = data.thread;
    const supabase = getSupabaseServerClient();

    const payload: Database["public"]["Tables"]["chat_threads"]["Insert"] = {
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
      messages: t.messages as unknown as Json,
    };

    const { error } = await supabase.from("chat_threads").upsert(payload, {
      onConflict: "customer_id",
    });

    if (error) {
      throw new Error(`Failed to save chat to Supabase: ${error.message}`);
    }

    return { configured: true, ok: true };
  });
