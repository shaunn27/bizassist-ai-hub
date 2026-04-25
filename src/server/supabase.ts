import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      chat_threads: {
        Row: {
          id: number;
          customer_id: string;
          customer_name: string | null;
          customer_phone: string | null;
          customer_avatar_color: string | null;
          customer_initials: string | null;
          source: string | null;
          flagged: "critical" | "warning" | "info" | null;
          unread: number;
          status: "open" | "resolved";
          waiting_minutes: number;
          last_message_preview: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_avatar_color?: string | null;
          customer_initials?: string | null;
          source?: string | null;
          flagged?: "critical" | "warning" | "info" | null;
          unread?: number;
          status?: "open" | "resolved";
          waiting_minutes?: number;
          last_message_preview?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_avatar_color?: string | null;
          customer_initials?: string | null;
          source?: string | null;
          flagged?: "critical" | "warning" | "info" | null;
          unread?: number;
          status?: "open" | "resolved";
          waiting_minutes?: number;
          last_message_preview?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let cachedClient: SupabaseClient<Database> | null = null;

function getEnv(name: string): string {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value?.trim() || "";
}

export function getSupabaseServerClient() {
  if (cachedClient) return cachedClient;

  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
    );
  }

  cachedClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  return Boolean(url && key);
}
