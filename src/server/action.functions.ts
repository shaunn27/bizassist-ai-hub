import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient, isSupabaseConfigured, type Database } from "@/server/supabase";

const DEMO_ORG_SLUG = "demo";
const DEMO_ORG_NAME = "BizAssist Demo";

const confirmOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().default(""),
  items: z.array(z.string()).min(1),
  total: z.number().nonnegative(),
  chatExcerpt: z.string().optional().default(""),
});

const confirmMeetingSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().default(""),
  date: z.string().min(1),
  time: z.string().min(1),
  duration: z.string().min(1),
  purpose: z.string().min(1),
});

async function ensureDemoOrganization() {
  const supabase = getSupabaseServerClient();
  const existing = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_ORG_SLUG)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Failed to load demo organization: ${existing.error.message}`);
  }

  if (existing.data?.id) return existing.data.id;

  const inserted = await supabase
    .from("organizations")
    .insert({ name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG })
    .select("id")
    .single();

  if (inserted.error) {
    throw new Error(`Failed to create demo organization: ${inserted.error.message}`);
  }

  return inserted.data.id;
}

async function ensureCustomer(orgId: string, customerName: string, customerPhone: string) {
  const supabase = getSupabaseServerClient();
  const byPhone = customerPhone
    ? await supabase
        .from("customers")
        .select("id")
        .eq("organization_id", orgId)
        .eq("phone_e164", customerPhone)
        .maybeSingle()
    : { data: null, error: null };

  if (byPhone && byPhone.error) {
    throw new Error(`Failed to find customer: ${byPhone.error.message}`);
  }

  if (byPhone.data?.id) return byPhone.data.id;

  const byName = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", orgId)
    .eq("display_name", customerName)
    .maybeSingle();

  if (byName.error) {
    throw new Error(`Failed to search customer: ${byName.error.message}`);
  }

  if (byName.data?.id) return byName.data.id;

  const inserted = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      display_name: customerName,
      phone_e164: customerPhone || null,
      status: "active",
    })
    .select("id")
    .single();

  if (inserted.error) {
    throw new Error(`Failed to create customer: ${inserted.error.message}`);
  }

  return inserted.data.id;
}

function buildOrderNo() {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export const persistConfirmedOrder = createServerFn({ method: "POST" })
  .inputValidator(confirmOrderSchema)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) {
      return { configured: false, ok: false };
    }

    const orgId = await ensureDemoOrganization();
    const customerId = await ensureCustomer(orgId, data.customerName, data.customerPhone);
    const supabase = getSupabaseServerClient();
    const orderNo = buildOrderNo();

    const orderInsert: Database["public"]["Tables"]["orders"]["Insert"] = {
      organization_id: orgId,
      customer_id: customerId,
      order_no: orderNo,
      status: "confirmed",
      subtotal: data.total,
      discount_total: 0,
      tax_total: 0,
      grand_total: data.total,
      notes: data.chatExcerpt || null,
    };

    const orderResult = await supabase.from("orders").insert(orderInsert).select("id").single();
    if (orderResult.error) {
      throw new Error(`Failed to save order: ${orderResult.error.message}`);
    }

    const orderId = orderResult.data.id;
    const itemLabel = data.items.join(", ");
    const itemInsert: Database["public"]["Tables"]["order_items"]["Insert"] = {
      order_id: orderId,
      item_name_snapshot: itemLabel,
      qty: 1,
      unit_price: data.total,
      line_total: data.total,
      notes: data.chatExcerpt || null,
    };

    const itemResult = await supabase.from("order_items").insert(itemInsert);
    if (itemResult.error) {
      throw new Error(`Failed to save order items: ${itemResult.error.message}`);
    }

    return { configured: true, ok: true, orderId, customerId, orderNo };
  });

export const persistConfirmedMeeting = createServerFn({ method: "POST" })
  .inputValidator(confirmMeetingSchema)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) {
      return { configured: false, ok: false };
    }

    const orgId = await ensureDemoOrganization();
    const customerId = await ensureCustomer(orgId, data.customerName, data.customerPhone);
    const supabase = getSupabaseServerClient();
    const startsAt = new Date(`${data.date}T${data.time}`).toISOString();

    const meetingInsert: Database["public"]["Tables"]["meetings"]["Insert"] = {
      organization_id: orgId,
      customer_id: customerId,
      starts_at: startsAt,
      purpose: data.purpose,
      status: "scheduled",
      notes: `Duration: ${data.duration}`,
    };

    const meetingResult = await supabase
      .from("meetings")
      .insert(meetingInsert)
      .select("id")
      .single();

    if (meetingResult.error) {
      throw new Error(`Failed to save meeting: ${meetingResult.error.message}`);
    }

    return { configured: true, ok: true, meetingId: meetingResult.data.id, customerId };
  });