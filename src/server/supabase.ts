import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string };
        Insert: { id?: string; name: string; slug: string };
        Update: { id?: string; name?: string; slug?: string };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          display_name: string;
          phone_e164: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          display_name: string;
          phone_e164?: string | null;
          email?: string | null;
          avatar_color?: string | null;
          initials?: string | null;
          status?: string | null;
          metadata_json?: Json;
        };
        Update: {
          id?: string;
          organization_id?: string;
          display_name?: string;
          phone_e164?: string | null;
          email?: string | null;
          avatar_color?: string | null;
          initials?: string | null;
          status?: string | null;
          metadata_json?: Json;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          order_no: string;
          status: "draft" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
          grand_total: number;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          order_no: string;
          status?: "draft" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
          subtotal?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          delivery_address?: string | null;
          deadline_at?: string | null;
          notes?: string | null;
          created_by_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          item_name_snapshot: string;
          qty: number;
          unit_price: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          item_name_snapshot: string;
          qty: number;
          unit_price: number;
          line_total: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          starts_at: string;
          purpose: string | null;
          status: "scheduled" | "completed" | "cancelled" | "no_show";
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          thread_id?: string | null;
          assigned_to_user_id?: string | null;
          starts_at: string;
          ends_at?: string | null;
          purpose?: string | null;
          status?: "scheduled" | "completed" | "cancelled" | "no_show";
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
        Relationships: [];
      };
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
