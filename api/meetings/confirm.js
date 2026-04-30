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
  const date = typeof data.date === "string" ? data.date.trim() : "";
  const time = typeof data.time === "string" ? data.time.trim() : "";
  const duration = typeof data.duration === "string" ? data.duration.trim() : "";
  const purpose = typeof data.purpose === "string" ? data.purpose.trim() : "";

  if (!customerName || !date || !time || !duration || !purpose) {
    return sendJson(res, 400, { error: "Invalid meeting payload." });
  }

  try {
    const supabase = getSupabaseServerClient();
    const orgId = await ensureDemoOrganization(supabase);
    const customerId = await ensureCustomer(supabase, orgId, customerName, customerPhone);
    const startsAt = new Date(`${date}T${time}`).toISOString();

    const meetingInsert = {
      organization_id: orgId,
      customer_id: customerId,
      starts_at: startsAt,
      purpose,
      status: "scheduled",
      notes: `Duration: ${duration}`,
    };

    const meetingResult = await supabase
      .from("meetings")
      .insert(meetingInsert)
      .select("id")
      .single();

    if (meetingResult.error) {
      throw new Error(`Failed to save meeting: ${meetingResult.error.message}`);
    }

    return sendJson(res, 200, {
      configured: true,
      ok: true,
      meetingId: meetingResult.data.id,
      customerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error.";
    return sendJson(res, 500, { error: message });
  }
}
