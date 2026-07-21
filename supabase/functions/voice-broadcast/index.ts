import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Supabase secret key is unavailable in the Edge Function environment.");
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

function isAdminProfile(profile: any, email: string) {
  return email === "afinch2678@gmail.com" || String(profile?.role || "").toLowerCase() === "admin";
}

async function authenticateAdmin(req: Request, admin: any) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 });
  const { data, error } = await admin.auth.getUser(jwt);
  const email = String(data?.user?.email || "").trim().toLowerCase();
  if (error || !email) throw new Response(JSON.stringify({ error: "Invalid or expired login session." }), { status: 401 });
  const { data: profile } = await admin.from("app_users").select("*").ilike("email", email).maybeSingle();
  if (!isAdminProfile(profile, email)) throw new Response(JSON.stringify({ error: "Administrator access is required for voice broadcast." }), { status: 403 });
  return { email, profile, isAdmin: true };
}

function twilioSecrets() {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim() || "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim() || "";
  const fromNumber = normalizePhone(Deno.env.get("TWILIO_FROM_NUMBER") || "");
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in LIVE Supabase Edge Function Secrets.");
  }
  return { accountSid, authToken, fromNumber };
}

async function twilioRequest(path: string, method = "GET", params?: URLSearchParams) {
  const { accountSid, authToken } = twilioSecrets();
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params?.toString(),
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
  if (!response.ok) throw new Error(firstText(payload.message, payload.error_message, payload.error, `Twilio request failed (${response.status}).`));
  return payload;
}

const stateTimeZones: Record<string, string> = {
  AL:"America/Chicago", AK:"America/Anchorage", AZ:"America/Phoenix", AR:"America/Chicago", CA:"America/Los_Angeles",
  CO:"America/Denver", CT:"America/New_York", DE:"America/New_York", FL:"America/New_York", GA:"America/New_York",
  HI:"Pacific/Honolulu", ID:"America/Boise", IL:"America/Chicago", IN:"America/Indiana/Indianapolis", IA:"America/Chicago",
  KS:"America/Chicago", KY:"America/New_York", LA:"America/Chicago", ME:"America/New_York", MD:"America/New_York",
  MA:"America/New_York", MI:"America/Detroit", MN:"America/Chicago", MS:"America/Chicago", MO:"America/Chicago",
  MT:"America/Denver", NE:"America/Chicago", NV:"America/Los_Angeles", NH:"America/New_York", NJ:"America/New_York",
  NM:"America/Denver", NY:"America/New_York", NC:"America/New_York", ND:"America/Chicago", OH:"America/New_York",
  OK:"America/Chicago", OR:"America/Los_Angeles", PA:"America/New_York", RI:"America/New_York", SC:"America/New_York",
  SD:"America/Chicago", TN:"America/Chicago", TX:"America/Chicago", UT:"America/Denver", VT:"America/New_York",
  VA:"America/New_York", WA:"America/Los_Angeles", WV:"America/New_York", WI:"America/Chicago", WY:"America/Denver", DC:"America/New_York",
};

function localParts(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function phoneCandidates(account: any) {
  const rows: { phone: string; slot: string }[] = [];
  const blockedWords = /wrong|bad|invalid|disconnect|dnc|do not call/i;
  for (let index = 1; index <= 10; index += 1) {
    const phone = normalizePhone(account[`phone${index}`]);
    const status = firstText(account[`phone${index}_status`], account[`phone${index}_note`]);
    if (phone && !blockedWords.test(status)) rows.push({ phone, slot: `phone${index}` });
  }
  return rows.filter((row, index, list) => list.findIndex((other) => other.phone === row.phone) === index);
}

async function complianceSnapshot(admin: any, account: any) {
  const reasons: string[] = [];
  const status = String(account.status || account.disposition || "").toLowerCase();
  if (account.do_not_call || status === "dnc") reasons.push("Do Not Call");
  if (account.cease_and_desist) reasons.push("Cease and Desist");
  if (account.bankruptcy_flag) reasons.push("Bankruptcy");
  if (account.deceased_flag) reasons.push("Deceased");
  if (account.attorney_represented) reasons.push("Attorney Represented");
  if (account.wrong_number_flag || /bad number|wrong number/.test(status)) reasons.push("Wrong Number / Bad Number");
  if (account.disputed_flag || status === "disputed") reasons.push("Disputed / Frozen");
  if (account.needs_manager_review) reasons.push("Manager Review Required");

  const timeZone = firstText(account.compliance_time_zone, stateTimeZones[String(account.state || "").toUpperCase()], "America/New_York");
  const local = localParts(timeZone);
  const callStart = firstText(account.compliance_call_start, "08:00").slice(0, 5);
  const callEnd = firstText(account.compliance_call_end, "21:00").slice(0, 5);
  const inWindow = callStart <= callEnd ? local.time >= callStart && local.time <= callEnd : local.time >= callStart || local.time <= callEnd;
  if (!inWindow) reasons.push(`Outside Call Window (${callStart}-${callEnd} ${timeZone})`);

  const maxCalls = Math.max(1, Number(account.max_calls_per_day || 2));
  const since = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();
  const { data: recentCalls } = await admin.from("voice_broadcast_calls").select("started_at").eq("account_id", account.id).gte("started_at", since).limit(100);
  const callsToday = (recentCalls || []).filter((row: any) => localParts(timeZone, new Date(row.started_at)).date === local.date).length;
  if (callsToday >= maxCalls) reasons.push(`Daily Call Limit Reached (${callsToday}/${maxCalls})`);

  return {
    allowed: reasons.length === 0,
    reasons,
    timeZone,
    localDate: local.date,
    localTime: local.time,
    callStart,
    callEnd,
    callsToday,
    maxCalls,
    checkedAt: new Date().toISOString(),
  };
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
    } catch { /* telemetry must never stop dialing */ }
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
    return true;
  }
  return false;
}

async function dispatchBatch(admin: any, actor: any, input: any) {
  const campaignId = firstText(input.campaignId);
  console.log("[voice-broadcast] dispatch_batch received", { campaignId, maxBatch: input.maxBatch || 10, actor: actor?.email || null });
  if (!campaignId) throw new Response(JSON.stringify({ error: "campaignId is required." }), { status: 400 });
  const { data: campaign } = await admin.from("voice_broadcast_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) throw new Response(JSON.stringify({ error: "Voice broadcast campaign was not found." }), { status: 404 });
  console.log("[voice-broadcast] campaign loaded", { campaignId, status: campaign.status, maxConcurrent: campaign.max_concurrent, callsPerMinute: campaign.calls_per_minute });
  if (campaign.status !== "running") return { success: false, idle: true, message: `Campaign is ${campaign.status}.` };
  if (!campaign.compliance_confirmed) throw new Response(JSON.stringify({ error: "The campaign compliance confirmation was not completed." }), { status: 409 });
  const transferNumber = normalizePhone(campaign.transfer_number);
  if (!transferNumber) throw new Response(JSON.stringify({ error: "A valid RingCentral group/queue phone number is required." }), { status: 409 });
  twilioSecrets();

  const activeStatuses = ["initiated", "ringing", "answered", "human", "gathering", "pressed_1", "transferring", "connected"];
  const { count: activeCount } = await admin.from("voice_broadcast_calls")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", activeStatuses);
  const maxConcurrent = Math.max(1, Math.min(10, Number(campaign.max_concurrent || 1)));
  const concurrencySlots = Math.max(0, maxConcurrent - Number(activeCount || 0));

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await admin.from("voice_broadcast_calls")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .gte("started_at", minuteAgo);
  const callsPerMinute = Math.max(1, Math.min(60, Number(campaign.calls_per_minute || 6)));
  const rateSlots = Math.max(0, callsPerMinute - Number(recentCount || 0));
  const requested = Math.max(1, Math.min(10, Number(input.maxBatch || 10)));
  const slots = Math.min(concurrencySlots, rateSlots, requested);
  if (slots <= 0) return { success: true, idle: true, activeCount: Number(activeCount || 0), message: "Waiting for capacity or the next pacing window." };

  const { data: queued } = await admin.from("voice_broadcast_campaign_accounts")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("status", ["queued", "retry"])
    .order("sort_order", { ascending: true })
    .limit(Math.max(25, slots * 5));

  const launched: any[] = [];
  const blocked: any[] = [];
  console.log("[voice-broadcast] queue scan", { campaignId, queuedCount: (queued || []).length, slots, activeCount: Number(activeCount || 0), recentCount: Number(recentCount || 0) });
  for (const candidate of queued || []) {
    if (launched.length >= slots) break;
    const { data: account } = await admin.from("accounts").select("*").eq("id", candidate.account_id).maybeSingle();
    if (!account) {
      await admin.from("voice_broadcast_campaign_accounts").update({ status: "failed", last_error: "Account not found", updated_at: new Date().toISOString() }).eq("id", candidate.id);
      blocked.push({ id: candidate.id, reason: "Account not found" });
      continue;
    }

    const compliance = await complianceSnapshot(admin, account);
    const phones = phoneCandidates(account);
    const testOverride = normalizePhone(account.test_phone_override);
    const selectedPhone = testOverride || normalizePhone(candidate.phone_number) || phones[0]?.phone || "";
    const selectedSlot = testOverride ? "test_phone_override" : (candidate.phone_slot || phones.find((row) => row.phone === selectedPhone)?.slot || phones[0]?.slot || "");
    const campaignFilters = campaign.filters && typeof campaign.filters === "object" ? campaign.filters : {};
    const isSpecificAccountTest = campaignFilters.mode === "specific_accounts" && selectedSlot === "test_phone_override";
    const effectiveCompliance = isSpecificAccountTest
      ? { ...compliance, allowed: true, admin_test_override: true, original_allowed: compliance.allowed }
      : compliance;
    if (!effectiveCompliance.allowed || !selectedPhone) {
      const reason = selectedPhone ? (compliance.reasons.join(", ") || "Compliance restriction") : "No callable phone number";
      await admin.from("voice_broadcast_campaign_accounts").update({
        status: "blocked",
        last_result: "Compliance Block",
        last_error: reason,
        compliance_snapshot: effectiveCompliance,
        updated_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      await insertActivity(admin, account.id, "Broadcast Compliance Block", `Voice broadcast skipped account: ${reason}.`, actor.email, selectedPhone);
      blocked.push({ id: candidate.id, reason });
      continue;
    }

    const now = new Date().toISOString();
    const { data: claimed } = await admin.from("voice_broadcast_campaign_accounts").update({
      status: "initiating",
      phone_number: selectedPhone,
      phone_slot: selectedSlot,
      last_attempt_at: now,
      compliance_snapshot: effectiveCompliance,
      last_error: null,
      updated_at: now,
    }).eq("id", candidate.id).in("status", ["queued", "retry"]).select("*").maybeSingle();
    if (!claimed) continue;

    const { data: call, error: callError } = await admin.from("voice_broadcast_calls").insert({
      campaign_id: campaign.id,
      campaign_account_id: candidate.id,
      account_id: account.id,
      phone_number: selectedPhone,
      status: "initiated",
      started_at: now,
    }).select("*").single();
    if (callError) throw callError;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
      if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
      const webhookBase = `${supabaseUrl}/functions/v1/voice-broadcast-webhook`;
      const { fromNumber } = twilioSecrets();
      const params = new URLSearchParams();
      params.set("To", selectedPhone);
      params.set("From", fromNumber);
      params.set("Url", `${webhookBase}?route=answer&callRowId=${encodeURIComponent(call.id)}`);
      params.set("Method", "POST");
      params.set("StatusCallback", `${webhookBase}?route=status&callRowId=${encodeURIComponent(call.id)}`);
      params.set("StatusCallbackMethod", "POST");
      for (const event of ["initiated", "ringing", "answered", "completed"]) params.append("StatusCallbackEvent", event);
      params.set("Timeout", "25");
      // Do not use synchronous Twilio Answering Machine Detection here.
      // AMD holds the call in silence before Twilio requests the answer webhook,
      // and keypad noise can cause only part of the message to play.
      // Press-1 campaigns must begin speaking immediately after answer.

      console.log("[voice-broadcast] dialing account", { campaignId, campaignAccountId: candidate.id, accountId: account.id, phoneNumber: selectedPhone });
      const payload = await twilioRequest("/Calls.json", "POST", params);
      const providerSid = firstText(payload.sid);
      await admin.from("voice_broadcast_calls").update({
        provider_call_sid: providerSid || null,
        status: firstText(payload.status, "initiated"),
        provider_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq("id", call.id);
      await admin.from("voice_broadcast_campaign_accounts").update({
        status: "ringing",
        attempt_count: Number(candidate.attempt_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      await insertActivity(admin, account.id, "Voice Broadcast Attempt", `Voice broadcast call started to ${selectedPhone}.`, actor.email, selectedPhone);
      launched.push({ callId: call.id, providerCallSid: providerSid, accountId: account.id, phoneNumber: selectedPhone });
      console.log("[voice-broadcast] Twilio call created", { campaignId, callId: call.id, providerCallSid: providerSid, phoneNumber: selectedPhone });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = Number(candidate.attempt_count || 0) + 1;
      const retry = attempts < Number(campaign.max_attempts || 1);
      await admin.from("voice_broadcast_calls").update({
        status: "failed",
        result: "Provider Error",
        ended_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
        provider_payload: { error: message },
        updated_at: new Date().toISOString(),
      }).eq("id", call.id);
      await admin.from("voice_broadcast_campaign_accounts").update({
        status: retry ? "retry" : "failed",
        attempt_count: attempts,
        last_result: "Provider Error",
        last_error: message,
        sort_order: retry ? Date.now() : candidate.sort_order,
        updated_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      await insertActivity(admin, account.id, "Voice Broadcast Error", `Twilio could not start the call: ${message}`, actor.email, selectedPhone);
      blocked.push({ id: candidate.id, reason: message });
      console.error("[voice-broadcast] Twilio call failed", { campaignId, campaignAccountId: candidate.id, accountId: account.id, phoneNumber: selectedPhone, error: message });
    }
  }

  const completed = await maybeCompleteCampaign(admin, campaignId);
  console.log("[voice-broadcast] dispatch_batch completed", { campaignId, launchedCount: launched.length, blockedCount: blocked.length, campaignComplete: completed });
  const blockedReasons = Array.from(new Set(blocked.map((row: any) => firstText(row?.reason)).filter(Boolean))).slice(0, 5);
  const noCallMessage = blockedReasons.length
    ? `No calls were started. ${blockedReasons.join(" | ")}`
    : ((queued || []).length === 0 ? "The campaign queue has no queued accounts." : "No callable accounts were started in this cycle.");
  return {
    success: true,
    launched,
    launchedCount: launched.length,
    blockedCount: blocked.length,
    blockedReasons,
    queuedCount: (queued || []).length,
    activeCount: Number(activeCount || 0) + launched.length,
    campaignComplete: completed,
    message: launched.length ? `${launched.length} broadcast call(s) started.` : noCallMessage,
  };
}

async function startManualTest(input: any) {
  const requestedNumber = normalizePhone(input.testNumber);
  const mode = firstText(input.testMode).toLowerCase();
  const transferNumber = normalizePhone(input.transferNumber);
  const message = firstText(
    input.message,
    mode === "queue"
      ? "This is a Co Pilot RingCentral queue test."
      : mode === "transfer"
      ? "This is a Co Pilot transfer test. Please hold while we connect your call."
      : "This is a Co Pilot voice broadcast test call."
  );

  if (!["call", "transfer", "queue"].includes(mode)) {
    throw new Response(JSON.stringify({ error: "testMode must be call, transfer, or queue." }), { status: 400 });
  }
  if (mode !== "queue" && !requestedNumber) {
    throw new Response(JSON.stringify({ error: "Enter a valid manual test phone number." }), { status: 400 });
  }
  if ((mode === "transfer" || mode === "queue") && !transferNumber) {
    throw new Response(JSON.stringify({ error: "Save a valid RingCentral queue number before testing." }), { status: 400 });
  }

  const { fromNumber } = twilioSecrets();
  const destination = mode === "queue" ? transferNumber : requestedNumber;
  let twiml = `<Response><Say voice="alice">${xmlEscape(message)}</Say>`;
  if (mode === "transfer") {
    twiml += `<Say voice="alice">Connecting the RingCentral group now.</Say><Dial answerOnBridge="true" timeout="25" callerId="${xmlEscape(fromNumber)}"><Number>${xmlEscape(transferNumber)}</Number></Dial>`;
  }
  twiml += `<Hangup/></Response>`;

  const params = new URLSearchParams();
  params.set("To", destination);
  params.set("From", fromNumber);
  params.set("Twiml", twiml);
  params.set("Timeout", "25");

  const payload = await twilioRequest("/Calls.json", "POST", params);
  return {
    success: true,
    testMode: mode,
    testNumber: requestedNumber || null,
    transferNumber: transferNumber || null,
    providerCallSid: firstText(payload.sid),
    providerStatus: firstText(payload.status, "queued"),
    message: mode === "queue"
      ? `RingCentral queue test started to ${transferNumber}.`
      : mode === "transfer"
      ? `Transfer test started to ${requestedNumber}. Answer it and the RingCentral queue will ring.`
      : `Test call started to ${requestedNumber}.`,
  };
}

async function campaignControl(admin: any, actor: any, input: any) {
  const campaignId = firstText(input.campaignId);
  const command = firstText(input.command).toLowerCase();
  if (!campaignId || !["start", "pause", "resume", "stop"].includes(command)) {
    throw new Response(JSON.stringify({ error: "A valid campaignId and command are required." }), { status: 400 });
  }
  const { data: existing } = await admin.from("voice_broadcast_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!existing) throw new Response(JSON.stringify({ error: "Campaign not found." }), { status: 404 });
  if ((command === "start" || command === "resume") && !existing.compliance_confirmed) {
    throw new Response(JSON.stringify({ error: "Confirm the campaign compliance statement before starting." }), { status: 409 });
  }
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (command === "start") Object.assign(patch, { status: "running", started_at: now, paused_at: null, stopped_at: null, completed_at: null });
  if (command === "pause") Object.assign(patch, { status: "paused", paused_at: now });
  if (command === "resume") Object.assign(patch, { status: "running", paused_at: null });
  if (command === "stop") Object.assign(patch, { status: "stopped", stopped_at: now });
  const { data, error } = await admin.from("voice_broadcast_campaigns").update(patch).eq("id", campaignId).select("*").single();
  if (error) throw error;
  console.log("[voice-broadcast] campaign control", { campaignId, command, resultingStatus: data?.status, actor: actor?.email || null });

  let canceled = 0;
  if (command === "stop") {
    const { data: active } = await admin.from("voice_broadcast_calls").select("id,provider_call_sid,campaign_account_id")
      .eq("campaign_id", campaignId)
      .in("status", ["initiated", "ringing", "answered", "human", "gathering", "pressed_1", "transferring", "connected"]);
    for (const call of active || []) {
      if (call.provider_call_sid) {
        try {
          const params = new URLSearchParams({ Status: "completed" });
          await twilioRequest(`/Calls/${encodeURIComponent(call.provider_call_sid)}.json`, "POST", params);
        } catch { /* still mark canceled locally */ }
      }
      await admin.from("voice_broadcast_calls").update({ status: "canceled", result: "Campaign Stopped", ended_at: now, finalized_at: now, updated_at: now }).eq("id", call.id);
      await admin.from("voice_broadcast_campaign_accounts").update({ status: "canceled", last_result: "Campaign Stopped", updated_at: now }).eq("id", call.campaign_account_id);
      canceled += 1;
    }
  }
  let dispatch: any = null;
  if ((command === "start" || command === "resume") && input.dispatchImmediately !== false) {
    // Start the first dialing cycle inside the same request. This prevents the UI
    // from changing a campaign to Running/Completed without ever invoking Twilio.
    dispatch = await dispatchBatch(admin, actor, { campaignId, maxBatch: input.maxBatch || 10 });
  }
  return {
    success: true,
    campaign: data,
    canceled,
    dispatch,
    message: dispatch?.message || `Campaign ${command} completed.`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const input = await req.json().catch(() => ({}));
    const action = firstText(input.action).toLowerCase();

    // Connection testing is read-only and does not expose the Twilio auth token.
    // Keep it independent of the Co Pilot browser session so admins can diagnose
    // provider configuration even when an access token is stale or unavailable.
    if (action === "connection_status") {
      const secrets = twilioSecrets();
      const payload = await twilioRequest(`.json`, "GET");
      return json({
        success: true,
        connected: true,
        accountSidLast4: secrets.accountSid.slice(-4),
        fromNumber: secrets.fromNumber,
        accountStatus: payload.status || "active",
        friendlyName: payload.friendly_name || payload.friendlyName || "Twilio",
      });
    }

    const actor = await authenticateAdmin(req, admin);
    if (action === "manual_test") return json(await startManualTest(input));
    if (action === "dispatch_batch") return json(await dispatchBatch(admin, actor, input));
    if (action === "campaign_control") return json(await campaignControl(admin, actor, input));
    return json({ error: "Unknown voice broadcast action." }, 400);
  } catch (error) {
    if (error instanceof Response) {
      const body = await error.text().catch(() => "");
      return new Response(body || JSON.stringify({ error: "Request failed." }), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Voice broadcast function error", error);
    return json({ error: error instanceof Error ? error.message : "Voice broadcast request failed." }, 500);
  }
});
