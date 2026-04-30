import { readJson, sendJson, methodNotAllowed } from "../_utils.js";
import { getSupabaseServerClient, isSupabaseConfigured } from "../../src/server/supabase";

const DEMO_ORG_SLUG = "demo";
const DEMO_ORG_NAME = "BizAssist Demo";

async function ensureDemoOrganization(supabase) {
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

async function ensureCustomer(supabase, orgId, customerName, customerPhone) {
  if (customerPhone) {
    const byPhone = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", orgId)
      .eq("phone_e164", customerPhone)
      .maybeSingle();

    if (byPhone.error) {
      throw new Error(`Failed to find customer: ${byPhone.error.message}`);
    }

    if (byPhone.data?.id) return byPhone.data.id;
  }

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

  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "";
  const customerPhone = typeof data.customerPhone === "string" ? data.customerPhone.trim() : "";
  const items = Array.isArray(data.items)
    ? data.items.filter((item) => typeof item === "string" && item.trim())
    : [];
  const total = typeof data.total === "number" ? data.total : Number(data.total);
  const chatExcerpt = typeof data.chatExcerpt === "string" ? data.chatExcerpt : "";

  if (!customerName || items.length === 0 || !Number.isFinite(total) || total < 0) {
    return sendJson(res, 400, { error: "Invalid order payload." });
  }

  try {
    const supabase = getSupabaseServerClient();
    const orgId = await ensureDemoOrganization(supabase);
    const customerId = await ensureCustomer(supabase, orgId, customerName, customerPhone);
    const orderNo = buildOrderNo();

    const orderInsert = {
      organization_id: orgId,
      customer_id: customerId,
      order_no: orderNo,
      status: "confirmed",
      subtotal: total,
      discount_total: 0,
      tax_total: 0,
      grand_total: total,
      notes: chatExcerpt || null,
    };

    const orderResult = await supabase.from("orders").insert(orderInsert).select("id").single();
    if (orderResult.error) {
      throw new Error(`Failed to save order: ${orderResult.error.message}`);
    }

    const orderId = orderResult.data.id;
    const itemLabel = items.join(", ");
    const itemInsert = {
      order_id: orderId,
      item_name_snapshot: itemLabel,
      qty: 1,
      unit_price: total,
      line_total: total,
      notes: chatExcerpt || null,
    };

    const itemResult = await supabase.from("order_items").insert(itemInsert);
    if (itemResult.error) {
      throw new Error(`Failed to save order items: ${itemResult.error.message}`);
    }

    return sendJson(res, 200, { configured: true, ok: true, orderId, customerId, orderNo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
