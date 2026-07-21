import { createClient } from "npm:@supabase/supabase-js@2";

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable.");
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.default || Object.values(parsed)[0] || "");
  } catch {
    return raw;
  }
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

function xmlEscape(value: unknown) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xml(body: string, status = 200) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

async function expectedTwilioSignature(url: string, params: URLSearchParams, authToken: string) {
  let data = url;
  const keys = [...new Set(Array.from(params.keys()))].sort();
  for (const key of keys) {
    const values = params.getAll(key).sort();
    for (const value of values) data += key + value;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64(new Uint8Array(signature));
}

async function verifyTwilioRequest(req: Request, params: URLSearchParams) {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim() || "";
  if (!authToken) throw new Error("TWILIO_AUTH_TOKEN is not configured.");

  const sent =
    req.headers.get("X-Twilio-Signature") ||
    req.headers.get("x-twilio-signature") ||
    "";

  if (!sent) {
    console.error("Twilio webhook rejected: missing X-Twilio-Signature header.");
    return false;
  }

  /*
   * Twilio signs the exact public callback URL, including the query string.
   * Supabase may expose a different internal request URL at runtime, so build
   * the canonical public URL from SUPABASE_URL and this function's fixed slug.
   */
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim().replace(/\/$/, "") || "";
  if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");

  const requestUrl = new URL(req.url);
  const configuredBase = Deno.env.get("TWILIO_WEBHOOK_BASE_URL")?.trim().replace(/\/$/, "") || "";
  const publicBase = configuredBase || `${supabaseUrl}/functions/v1/voice-broadcast-webhook`;
  const signedUrl = `${publicBase}${requestUrl.search}`;

  const expected = await expectedTwilioSignature(signedUrl, params, authToken);
  const valid = safeEqual(sent, expected);

  if (!valid) {
    console.error("Twilio webhook rejected: signature mismatch.", {
      signedUrl,
      hasSignature: Boolean(sent),
    });
  }

  return valid;
}

async function insertActivity(admin: any, accountId: string, type: string, text: string, email: string, phone = "") {
  try {
    await admin.from("activity_logs").insert({
      account_id: accountId,
      action_type: type,
      action_text: text,
      phone_number: phone || null,
      created_by_email: email,
      created_at: new Date().toISOString(),
    });
  } catch {
    try {
      await admin.from("activity_logs").insert({ account_id: accountId, action_type: type, action_text: text, created_by_email: email });
    } catch { /* do not break call flow */ }
  }
}

async function maybeCompleteCampaign(admin: any, campaignId: string) {
  const { count } = await admin.from("voice_broadcast_campaign_accounts")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["queued", "retry", "initiating", "ringing", "human", "pressed_1", "transferring", "connected"]);
  if (!count) {
    await admin.from("voice_broadcast_campaigns").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId).eq("status", "running");
  }
}

function resultStatus(result: string) {
  const value = result.toLowerCase();
  if (value === "no answer") return "no_answer";
  if (value === "busy") return "busy";
  if (value.includes("fail") || value.includes("provider")) return "failed";
  if (value.includes("cancel") || value.includes("stopped")) return "canceled";
  return "completed";
}

async function finalizeOutcome(admin: any, callRow: any, campaign: any, result: string, extra: Record<string, unknown> = {}) {
  if (!callRow || callRow.finalized_at) return { finalized: false, result: callRow?.result || result };
  const now = new Date().toISOString();
  const status = resultStatus(result);
  const duration = Math.max(0, Number(extra.duration_seconds || callRow.duration_seconds || 0));
  const { data: finalizedCall } = await admin.from("voice_broadcast_calls").update({
    status,
    result,
    duration_seconds: duration,
    ended_at: callRow.ended_at || now,
    finalized_at: now,
    provider_payload: { ...(callRow.provider_payload || {}), ...extra },
    updated_at: now,
  }).eq("id", callRow.id).is("finalized_at", null).select("*").maybeSingle();
  if (!finalizedCall) return { finalized: false, result };

  const { data: campaignAccount } = await admin.from("voice_broadcast_campaign_accounts").select("*").eq("id", callRow.campaign_account_id).maybeSingle();
  const attempts = Number(campaignAccount?.attempt_count || 0);
  const retryable = ["no answer", "busy", "failed", "provider error"].includes(result.toLowerCase());
  const shouldRetry = retryable && attempts < Number(campaign.max_attempts || 1) && campaign.status === "running";
  const accountStatus = shouldRetry ? "retry" : status === "no_answer" ? "no_answer" : status === "busy" ? "busy" : status === "failed" ? "failed" : status === "canceled" ? "canceled" : "completed";
  await admin.from("voice_broadcast_campaign_accounts").update({
    status: accountStatus,
    last_result: result,
    last_error: status === "failed" ? firstText(extra.error, result) : null,
    sort_order: shouldRetry ? Date.now() : campaignAccount?.sort_order,
    updated_at: now,
  }).eq("id", callRow.campaign_account_id);

  const { data: account } = await admin.from("accounts").select("*").eq("id", callRow.account_id).maybeSingle();
  if (account) {
    const patch: Record<string, unknown> = {
      last_contact_number: callRow.phone_number,
      last_called_at: now,
      last_call_result: result,
      call_count: Number(account.call_count || 0) + 1,
      updated_at: now,
    };
    if (result === "Left Voicemail") patch.voicemail_count = Number(account.voicemail_count || 0) + 1;
    if (result === "No Answer") patch.no_answer_count = Number(account.no_answer_count || 0) + 1;
    try {
      await admin.from("accounts").update(patch).eq("id", callRow.account_id);
    } catch {
      try { await admin.from("accounts").update({ last_contact_number: callRow.phone_number, updated_at: now }).eq("id", callRow.account_id); } catch { /* ignore */ }
    }
  }

  const isContact = ["Transferred to Agent Queue", "No Agent Available", "No Transfer Requested"].includes(result);
  const outcomeCategory = result === "Transferred to Agent Queue" ? "Contact" : result === "Left Voicemail" ? "Voicemail" : "No Contact";
  try {
    await admin.from("call_results").insert({
      account_id: callRow.account_id,
      phone_number: callRow.phone_number,
      call_result: result,
      disposition: result,
      direction: "Outbound",
      outcome_category: outcomeCategory,
      duration_seconds: duration,
      answered_by: callRow.answered_by || null,
      is_contact: isContact,
      is_rpc: false,
      is_promise: false,
      is_callback: false,
      is_wrong_number: false,
      call_source: "Co Pilot Voice Broadcast",
      notes: `Voice broadcast campaign: ${campaign.name}`,
      result_at: now,
      created_by_email: campaign.created_by_email,
    });
  } catch {
    try {
      await admin.from("call_results").insert({
        account_id: callRow.account_id,
        phone_number: callRow.phone_number,
        call_result: result,
        disposition: result,
        duration_seconds: duration,
        notes: `Voice broadcast campaign: ${campaign.name}`,
        created_by_email: campaign.created_by_email,
      });
    } catch { /* legacy schema compatibility */ }
  }
  await insertActivity(admin, callRow.account_id, "Voice Broadcast Result", `${result} — campaign ${campaign.name}.`, campaign.created_by_email, callRow.phone_number);
  await maybeCompleteCampaign(admin, callRow.campaign_id);
  return { finalized: true, result, retry: shouldRetry };
}

async function context(admin: any, callRowId: string) {
  const { data: callRow } = await admin.from("voice_broadcast_calls").select("*").eq("id", callRowId).maybeSingle();
  if (!callRow) throw new Error("Voice broadcast call record was not found.");
  const { data: campaign } = await admin.from("voice_broadcast_campaigns").select("*").eq("id", callRow.campaign_id).maybeSingle();
  if (!campaign) throw new Error("Voice broadcast campaign was not found.");
  return { callRow, campaign };
}

function webhookUrl(req: Request, route: string, callRowId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim().replace(/\/$/, "") || "";
  if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");

  const configuredBase = Deno.env.get("TWILIO_WEBHOOK_BASE_URL")?.trim().replace(/\/$/, "") || "";
  const publicBase = configuredBase || `${supabaseUrl}/functions/v1/voice-broadcast-webhook`;
  const url = new URL(publicBase);
  url.searchParams.set("route", route);
  url.searchParams.set("callRowId", callRowId);
  return url.toString();
}

function dialQueueTwiml(req: Request, campaign: any, callRow: any) {
  const transferNumber = normalizePhone(campaign.transfer_number);
  const fromNumber = normalizePhone(Deno.env.get("TWILIO_FROM_NUMBER") || "");
  const action = webhookUrl(req, "dial-complete", callRow.id);
  return `<Dial answerOnBridge="true" timeout="25" callerId="${xmlEscape(fromNumber)}" action="${xmlEscape(action)}" method="POST"><Number>${xmlEscape(transferNumber)}</Number></Dial>`;
}


async function createLiveTransfer(admin: any, callRow: any, campaign: any) {
  if (!callRow?.account_id || !callRow?.id) return;
  const now = new Date();
  await admin.from("voice_broadcast_live_transfers").upsert({
    call_id: callRow.id,
    campaign_id: callRow.campaign_id,
    account_id: callRow.account_id,
    phone_number: callRow.phone_number || null,
    status: "waiting",
    claimed_by_email: null,
    claimed_at: null,
    expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "call_id" });
}

async function handleAnswer(req: Request, params: URLSearchParams, admin: any, callRow: any, campaign: any) {
  const answeredBy = firstText(params.get("AnsweredBy"), "unknown").toLowerCase();
  const providerSid = firstText(params.get("CallSid"), callRow.provider_call_sid);
  const now = new Date().toISOString();
  const humanLike = answeredBy === "human" || answeredBy === "unknown";
  const machineLike = answeredBy.startsWith("machine");
  await admin.from("voice_broadcast_calls").update({
    provider_call_sid: providerSid || null,
    status: humanLike ? "human" : machineLike ? "machine" : answeredBy === "fax" ? "completed" : "answered",
    answered_by: answeredBy,
    answered_at: now,
    provider_payload: { ...(callRow.provider_payload || {}), answer: Object.fromEntries(params.entries()) },
    updated_at: now,
  }).eq("id", callRow.id);
  await admin.from("voice_broadcast_campaign_accounts").update({
    status: humanLike ? "human" : machineLike ? "machine" : "completed",
    last_result: answeredBy,
    updated_at: now,
  }).eq("id", callRow.campaign_account_id);

  if (answeredBy === "fax") {
    await finalizeOutcome(admin, { ...callRow, answered_by: answeredBy }, campaign, "Fax Machine");
    return xml("<Hangup/>");
  }
  if (machineLike) {
    if (campaign.leave_voicemail && firstText(campaign.voicemail_message_text)) {
      await finalizeOutcome(admin, { ...callRow, answered_by: answeredBy }, campaign, "Left Voicemail");
      return xml(`<Pause length="1"/><Say voice="alice">${xmlEscape(campaign.voicemail_message_text)}</Say><Hangup/>`);
    }
    await finalizeOutcome(admin, { ...callRow, answered_by: answeredBy }, campaign, "Machine Answer");
    return xml("<Hangup/>");
  }

  const message = firstText(campaign.live_message_text, "Please hold while we connect your call.");
  if (campaign.connect_mode === "auto_transfer") {
    await admin.from("voice_broadcast_calls").update({ status: "transferring", transferred_at: now, updated_at: now }).eq("id", callRow.id);
    await admin.from("voice_broadcast_campaign_accounts").update({ status: "transferring", updated_at: now }).eq("id", callRow.campaign_account_id);
    await createLiveTransfer(admin, callRow, campaign);
    return xml(`<Pause length="1"/><Say voice="alice">${xmlEscape(message)}</Say>${dialQueueTwiml(req, campaign, callRow)}`);
  }

  const gatherAction = webhookUrl(req, "gather", callRow.id);
  await admin.from("voice_broadcast_calls").update({ status: "gathering", updated_at: now }).eq("id", callRow.id);
  return xml(`<Pause length="1"/><Gather input="dtmf" numDigits="1" timeout="8" actionOnEmptyResult="true" action="${xmlEscape(gatherAction)}" method="POST"><Say voice="alice">${xmlEscape(message)}</Say></Gather><Say voice="alice">We did not receive a response. Goodbye.</Say><Hangup/>`);
}

async function handleGather(req: Request, params: URLSearchParams, admin: any, callRow: any, campaign: any) {
  const digits = firstText(params.get("Digits"));
  const now = new Date().toISOString();
  await admin.from("voice_broadcast_calls").update({ digits: digits || null, updated_at: now }).eq("id", callRow.id);
  if (digits === "1") {
    await admin.from("voice_broadcast_calls").update({ status: "transferring", transferred_at: now, updated_at: now }).eq("id", callRow.id);
    await admin.from("voice_broadcast_campaign_accounts").update({ status: "pressed_1", last_result: "Pressed 1", updated_at: now }).eq("id", callRow.campaign_account_id);
    await createLiveTransfer(admin, callRow, campaign);
    return xml(`<Pause length="1"/><Say voice="alice">Please hold while we connect you.</Say>${dialQueueTwiml(req, campaign, callRow)}`);
  }
  await finalizeOutcome(admin, callRow, campaign, "No Transfer Requested");
  return xml("<Say voice=\"alice\">Thank you. Goodbye.</Say><Hangup/>");
}

async function handleDialComplete(params: URLSearchParams, admin: any, callRow: any, campaign: any) {
  const dialStatus = firstText(params.get("DialCallStatus"), "failed").toLowerCase();
  const duration = Number(params.get("DialCallDuration") || 0);
  const bridged = firstText(params.get("DialBridged")).toLowerCase() === "true";
  const now = new Date().toISOString();
  await admin.from("voice_broadcast_calls").update({
    status: bridged || dialStatus === "completed" ? "connected" : "completed",
    transfer_status: dialStatus,
    duration_seconds: duration,
    provider_parent_call_sid: firstText(params.get("DialCallSid")) || null,
    updated_at: now,
  }).eq("id", callRow.id);
  await admin.from("voice_broadcast_campaign_accounts").update({
    status: bridged || dialStatus === "completed" ? "connected" : "completed",
    last_result: dialStatus,
    updated_at: now,
  }).eq("id", callRow.campaign_account_id);
  if (bridged || dialStatus === "completed") {
    await admin.from("voice_broadcast_live_transfers").update({ status: "connected", updated_at: now }).eq("call_id", callRow.id).eq("status", "waiting");
  } else {
    await admin.from("voice_broadcast_live_transfers").update({ status: "expired", updated_at: now }).eq("call_id", callRow.id).eq("status", "waiting");
  }
  const result = bridged || dialStatus === "completed" ? "Transferred to Agent Queue" : "No Agent Available";
  await finalizeOutcome(admin, { ...callRow, duration_seconds: duration }, campaign, result, { dialStatus, bridged, duration_seconds: duration });
  return xml("<Hangup/>");
}

async function handleStatus(params: URLSearchParams, admin: any, callRow: any, campaign: any) {
  const providerStatus = firstText(params.get("CallStatus"), params.get("CallStatusEvent"), callRow.status).toLowerCase();
  const duration = Number(params.get("CallDuration") || params.get("Duration") || callRow.duration_seconds || 0);
  const answeredBy = firstText(params.get("AnsweredBy"), callRow.answered_by);
  const now = new Date().toISOString();
  const mapped = providerStatus === "queued" ? "initiated" : providerStatus === "in-progress" ? "answered" : providerStatus;
  await admin.from("voice_broadcast_calls").update({
    provider_call_sid: firstText(params.get("CallSid"), callRow.provider_call_sid) || null,
    status: ["initiated","ringing","answered","completed","no-answer","busy","failed","canceled"].includes(mapped) ? mapped.replace("no-answer", "no_answer") : callRow.status,
    answered_by: answeredBy || null,
    duration_seconds: duration,
    ended_at: ["completed", "no-answer", "busy", "failed", "canceled"].includes(providerStatus) ? now : callRow.ended_at,
    provider_payload: { ...(callRow.provider_payload || {}), status: Object.fromEntries(params.entries()) },
    updated_at: now,
  }).eq("id", callRow.id);

  if (providerStatus === "no-answer") await finalizeOutcome(admin, { ...callRow, duration_seconds: duration }, campaign, "No Answer", { status: Object.fromEntries(params.entries()), duration_seconds: duration });
  else if (providerStatus === "busy") await finalizeOutcome(admin, { ...callRow, duration_seconds: duration }, campaign, "Busy", { status: Object.fromEntries(params.entries()), duration_seconds: duration });
  else if (providerStatus === "failed") await finalizeOutcome(admin, { ...callRow, duration_seconds: duration }, campaign, "Failed", { status: Object.fromEntries(params.entries()), duration_seconds: duration });
  else if (providerStatus === "canceled") await finalizeOutcome(admin, { ...callRow, duration_seconds: duration }, campaign, "Canceled", { status: Object.fromEntries(params.entries()), duration_seconds: duration });
  else if (providerStatus === "completed") {
    const { data: fresh } = await admin.from("voice_broadcast_calls").select("*").eq("id", callRow.id).maybeSingle();
    if (fresh && !fresh.finalized_at) await finalizeOutcome(admin, { ...fresh, duration_seconds: duration }, campaign, fresh.result || "Broadcast Completed", { status: Object.fromEntries(params.entries()), duration_seconds: duration });
  }
  return json({ received: true });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  try {
    if (!(await verifyTwilioRequest(req, params))) return json({ error: "Invalid Twilio signature." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const requestUrl = new URL(req.url);
    const route = firstText(requestUrl.searchParams.get("route")).toLowerCase();
    const callRowId = firstText(requestUrl.searchParams.get("callRowId"));
    if (!callRowId) return json({ error: "callRowId is required." }, 400);
    const { callRow, campaign } = await context(admin, callRowId);

    if (route === "answer") return await handleAnswer(req, params, admin, callRow, campaign);
    if (route === "gather") return await handleGather(req, params, admin, callRow, campaign);
    if (route === "dial-complete") return await handleDialComplete(params, admin, callRow, campaign);
    if (route === "status") return await handleStatus(params, admin, callRow, campaign);
    return json({ error: "Unknown webhook route." }, 400);
  } catch (error) {
    console.error("Voice broadcast webhook error", error);
    const route = new URL(req.url).searchParams.get("route") || "";
    if (route === "answer" || route === "gather" || route === "dial-complete") {
      return xml(`<Say voice="alice">We are unable to complete your call at this time. Goodbye.</Say><Hangup/>`, 200);
    }
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
  }
});
