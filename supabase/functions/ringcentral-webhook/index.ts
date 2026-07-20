import { createClient } from "npm:@supabase/supabase-js@2";

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable.");
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return raw;
  }
}

function response(body: unknown = {}, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return "";
}

function partyStatusCodes(body: any) {
  return (body?.parties || []).map((party: any) => firstText(party?.status?.code, party?.statusCode, party?.status)).filter(Boolean);
}

function payloadPhones(body: any) {
  const values: string[] = [];
  for (const party of body?.parties || []) {
    values.push(
      firstText(party?.to?.phoneNumber),
      firstText(party?.from?.phoneNumber),
      firstText(party?.peer?.phoneNumber),
      firstText(party?.extensionId),
    );
  }
  return [...new Set(values.map(normalizePhone).filter(Boolean))];
}

async function findMatchingCall(admin: any, event: any, body: any, subscriptionEmployeeEmail = "") {
  const telephonySessionId = firstText(body?.telephonySessionId, body?.sessionId);
  if (telephonySessionId) {
    const { data } = await admin.from("dialer_calls").select("*").eq("telephony_session_id", telephonySessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }

  const eventPath = firstText(event?.event, event?.eventFilter);
  const extensionMatch = eventPath.match(/\/extension\/([^/?]+)/i);
  const extensionId = extensionMatch ? decodeURIComponent(extensionMatch[1]) : "";
  const phones = payloadPhones(body);

  let query = admin.from("dialer_calls").select("*").in("status", ["initiated", "ringing", "answered"]).eq("disposition_required", true).order("created_at", { ascending: false }).limit(20);
  if (subscriptionEmployeeEmail) query = query.eq("employee_email", subscriptionEmployeeEmail.toLowerCase());
  if (extensionId && extensionId !== "~") query = query.eq("ringcentral_extension_id", extensionId);
  const { data: rows } = await query;
  if (!rows?.length) return null;
  if (phones.length) {
    const phoneMatch = rows.find((row: any) => phones.includes(normalizePhone(row.phone_number)));
    if (phoneMatch) return phoneMatch;
  }
  return rows[0];
}

async function processEvent(admin: any, event: any) {
  const body = event?.body || event?.event_body || {};
  const subscriptionId = firstText(event?.subscriptionId, event?.subscription_id);
  let subscriptionEmployeeEmail = "";
  if (subscriptionId) {
    const { data: subscription } = await admin.from("ringcentral_webhook_subscriptions").select("employee_email").eq("ringcentral_subscription_id", subscriptionId).maybeSingle();
    subscriptionEmployeeEmail = String(subscription?.employee_email || "").trim().toLowerCase();
  }
  const call = await findMatchingCall(admin, event, body, subscriptionEmployeeEmail);
  if (!call) return { matched: false };
  if (call.status === "completed" || call.disposition_required === false) return { matched: true, ignored: true, callId: call.id };

  const codes = partyStatusCodes(body);
  const normalizedCodes = codes.map((code) => code.toLowerCase());
  const telephonySessionId = firstText(body?.telephonySessionId, body?.sessionId, call.telephony_session_id);
  const providerPayload = { event, receivedAt: new Date().toISOString() };
  const now = new Date().toISOString();
  const answered = normalizedCodes.includes("answered");
  const disconnected = normalizedCodes.some((code) => ["disconnected", "gone"].includes(code));
  const ringing = normalizedCodes.some((code) => ["setup", "proceeding"].includes(code));

  if (answered && !call.answered_at) {
    await admin.from("dialer_calls").update({
      status: "answered",
      answered_at: now,
      telephony_session_id: telephonySessionId || null,
      provider_payload: providerPayload,
      updated_at: now,
    }).eq("id", call.id);
    await admin.from("dialer_campaign_accounts").update({ status: "connected", updated_at: now }).eq("id", call.campaign_account_id);
    await admin.from("dialer_agent_status").update({ status: "connected", current_call_id: call.id, last_seen_at: now, updated_at: now }).eq("employee_email", call.employee_email);
    await admin.from("dialer_screen_pops").upsert({
      call_id: call.id,
      account_id: call.account_id,
      employee_email: call.employee_email,
      status: "pending",
      event_payload: providerPayload,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: now,
    }, { onConflict: "call_id" });
    return { matched: true, callId: call.id, status: "answered" };
  }

  if (disconnected) {
    const start = new Date(call.answered_at || call.started_at).getTime();
    const duration = Math.max(0, Math.round((Date.now() - start) / 1000));
    await admin.from("dialer_calls").update({
      status: "disconnected",
      ended_at: now,
      duration_seconds: duration,
      telephony_session_id: telephonySessionId || null,
      provider_payload: providerPayload,
      updated_at: now,
    }).eq("id", call.id);
    await admin.from("dialer_campaign_accounts").update({ status: "wrap_up", updated_at: now }).eq("id", call.campaign_account_id);
    await admin.from("dialer_agent_status").update({ status: "wrap_up", current_call_id: call.id, last_seen_at: now, updated_at: now }).eq("employee_email", call.employee_email);
    return { matched: true, callId: call.id, status: "disconnected", durationSeconds: duration };
  }

  if (ringing) {
    await admin.from("dialer_calls").update({
      status: "ringing",
      telephony_session_id: telephonySessionId || null,
      provider_payload: providerPayload,
      updated_at: now,
    }).eq("id", call.id);
    await admin.from("dialer_campaign_accounts").update({ status: "ringing", updated_at: now }).eq("id", call.campaign_account_id);
    return { matched: true, callId: call.id, status: "ringing" };
  }

  await admin.from("dialer_calls").update({
    telephony_session_id: telephonySessionId || null,
    provider_payload: providerPayload,
    updated_at: now,
  }).eq("id", call.id);
  return { matched: true, callId: call.id, status: call.status, codes };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const validationHeader = req.headers.get("Validation-Token") || req.headers.get("validation-token") || "";
  const rawBody = await req.text();

  // RingCentral URL validation: echo its one-time token exactly and return quickly.
  const compactBody = rawBody.trim();
  if (validationHeader && (!compactBody || compactBody === "{}")) {
    return response({}, 200, { "Validation-Token": validationHeader });
  }

  try {
    const configuredToken = Deno.env.get("RC_WEBHOOK_VALIDATION_TOKEN")?.trim();
    if (!configuredToken) return response({ error: "Webhook validation token is not configured." }, 503);
    if (!validationHeader || validationHeader !== configuredToken) return response({ error: "Invalid RingCentral validation token." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const parsed = JSON.parse(rawBody || "{}");
    const events = Array.isArray(parsed) ? parsed : [parsed];
    const results = [];
    for (const event of events) results.push(await processEvent(admin, event));
    return response({ received: true, results }, 200, validationHeader ? { "Validation-Token": validationHeader } : {});
  } catch (error) {
    console.error("RingCentral webhook error", error);
    return response({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
  }
});
