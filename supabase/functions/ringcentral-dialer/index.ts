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
    return parsed.default || Object.values(parsed)[0] || "";
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

function isAdminProfile(profile: any, email: string) {
  return email === "afinch2678@gmail.com" || String(profile?.role || "").toLowerCase() === "admin";
}

async function authenticate(req: Request, admin: any) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 });
  const { data, error } = await admin.auth.getUser(jwt);
  const email = String(data?.user?.email || "").toLowerCase();
  if (error || !email) throw new Response(JSON.stringify({ error: "Invalid or expired login session." }), { status: 401 });
  const { data: profile } = await admin.from("app_users").select("*").ilike("email", email).maybeSingle();
  const isAdmin = isAdminProfile(profile, email);
  if (!isAdmin) {
    if (!profile) throw new Response(JSON.stringify({ error: "Application user profile was not found." }), { status: 403 });
    if (String(profile.role || "").toLowerCase() === "client") throw new Response(JSON.stringify({ error: "Client users cannot access the dialer." }), { status: 403 });
    if (profile.is_approved === false || profile.is_active === false || String(profile.approval_status || "approved").toLowerCase() !== "approved") {
      throw new Response(JSON.stringify({ error: "Your employee account is not approved and active." }), { status: 403 });
    }
  }
  return { email, profile, isAdmin };
}

const rcTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

function ringCentralUserJwt(employeeEmail: string) {
  const normalizedEmail = String(employeeEmail || "").trim().toLowerCase();
  const rawMap = Deno.env.get("RC_USER_JWTS_JSON")?.trim();
  if (rawMap) {
    try {
      const parsed = JSON.parse(rawMap);
      const direct = parsed?.[normalizedEmail];
      if (direct && String(direct).trim()) return String(direct).trim();
      for (const [key, value] of Object.entries(parsed || {})) {
        if (String(key).trim().toLowerCase() === normalizedEmail && String(value || "").trim()) return String(value).trim();
      }
    } catch {
      throw new Error("RC_USER_JWTS_JSON must be valid JSON keyed by lowercase Co Pilot employee email.");
    }
  }

  // Backward-compatible single-user fallback. It is deliberately bound to one email
  // so one RingCentral identity is never reused across multiple employees.
  const fallbackJwt = Deno.env.get("RC_USER_JWT")?.trim();
  const fallbackEmail = Deno.env.get("RC_DEFAULT_USER_EMAIL")?.trim().toLowerCase();
  if (fallbackJwt && fallbackEmail && fallbackEmail === normalizedEmail) return fallbackJwt;
  throw new Error(`No RingCentral user credential is configured for ${normalizedEmail}. Add it to RC_USER_JWTS_JSON in LIVE Supabase Edge Function Secrets.`);
}

async function ringCentralAccessToken(employeeEmail: string) {
  const normalizedEmail = String(employeeEmail || "").trim().toLowerCase();
  const cached = rcTokenCache.get(normalizedEmail);
  if (cached?.accessToken && Date.now() < cached.expiresAt - 60_000) return cached.accessToken;
  const clientId = Deno.env.get("RC_APP_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("RC_APP_CLIENT_SECRET")?.trim();
  const jwt = ringCentralUserJwt(normalizedEmail);
  const server = (Deno.env.get("RC_SERVER_URL") || "https://platform.ringcentral.com").replace(/\/$/, "");
  if (!clientId || !clientSecret) throw new Error("RingCentral app secrets are incomplete. Add RC_APP_CLIENT_ID and RC_APP_CLIENT_SECRET in LIVE Supabase Edge Function Secrets.");

  const response = await fetch(`${server}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(firstText(payload.error_description, payload.message, payload.error, `RingCentral authentication failed for ${normalizedEmail} (${response.status}).`));
  const tokenRow = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(300, Number(payload.expires_in || 3600)) * 1000,
  };
  rcTokenCache.set(normalizedEmail, tokenRow);
  return tokenRow.accessToken;
}

async function ringCentralFetch(employeeEmail: string, path: string, method = "GET", body?: unknown) {
  const server = (Deno.env.get("RC_SERVER_URL") || "https://platform.ringcentral.com").replace(/\/$/, "");
  const accessToken = await ringCentralAccessToken(employeeEmail);
  const response = await fetch(`${server}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
  if (!response.ok) throw new Error(firstText(payload.message, payload.error_description, payload.error, `RingCentral request failed (${response.status}).`));
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

function normalizePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return "";
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

function localParts(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

async function complianceSnapshot(admin: any, account: any) {
  const reasons: string[] = [];
  if (account.do_not_call) reasons.push("Do Not Call");
  if (account.cease_and_desist) reasons.push("Cease and Desist");
  if (account.bankruptcy_flag) reasons.push("Bankruptcy");
  if (account.deceased_flag) reasons.push("Deceased");
  if (account.attorney_represented) reasons.push("Attorney Represented");
  if (account.wrong_number_flag) reasons.push("Wrong Number / Bad Number");
  if (account.disputed_flag) reasons.push("Disputed Account");
  if (account.needs_manager_review) reasons.push("Manager Review Required");
  if (/dnc|bad number|closed/i.test(String(account.status || account.disposition || ""))) reasons.push(`Account Status: ${account.status || account.disposition}`);

  const timeZone = firstText(account.compliance_time_zone, stateTimeZones[String(account.state || "").toUpperCase()], "America/New_York");
  const local = localParts(timeZone);
  const callStart = firstText(account.compliance_call_start, "08:00").slice(0, 5);
  const callEnd = firstText(account.compliance_call_end, "21:00").slice(0, 5);
  if (local.time < callStart || local.time > callEnd) reasons.push(`Outside Call Window (${callStart}-${callEnd} ${timeZone})`);

  const maxCalls = Math.max(1, Number(account.max_calls_per_day || 2));
  const since = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();
  const { data: recentCalls } = await admin.from("dialer_calls").select("started_at").eq("account_id", account.id).gte("started_at", since).limit(100);
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
      await admin.from("activity_logs").insert({ account_id: accountId, action_type: type, action_text: text, created_by_email: email, created_at: new Date().toISOString() });
    } catch { /* activity telemetry must not break provider calls */ }
  }
}

async function setAgentStatus(admin: any, employeeEmail: string, status: string, campaignId: string | null, currentCallId: string | null) {
  const row = {
    employee_email: employeeEmail,
    status,
    campaign_id: campaignId,
    current_call_id: currentCallId,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("dialer_agent_status").upsert(row, { onConflict: "employee_email" }).select("*").single();
  if (error) throw error;
  return data;
}

async function dispatchNext(admin: any, actor: any, input: any) {
  const employeeEmail = String(input.employeeEmail || actor.email).toLowerCase();
  if (!actor.isAdmin && employeeEmail !== actor.email) throw new Response(JSON.stringify({ error: "Employees can dispatch only their own calls." }), { status: 403 });

  let campaignId = firstText(input.campaignId);
  if (!campaignId) {
    const { data: campaigns } = await admin.from("dialer_campaigns").select("*").eq("status", "running").contains("selected_employee_emails", [employeeEmail]).order("started_at", { ascending: true }).limit(1);
    campaignId = campaigns?.[0]?.id || "";
  }
  if (!campaignId) return { success: false, idle: true, message: "No running campaign is assigned to this employee." };

  const { data: campaign } = await admin.from("dialer_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign || campaign.status !== "running") return { success: false, idle: true, message: "The selected campaign is not running." };
  if (!(campaign.selected_employee_emails || []).map((value: string) => value.toLowerCase()).includes(employeeEmail)) throw new Response(JSON.stringify({ error: "This employee is not assigned to the campaign." }), { status: 403 });

  const { data: agent } = await admin.from("dialer_agent_status").select("*").eq("employee_email", employeeEmail).maybeSingle();
  if (!agent || agent.status !== "available") return { success: false, idle: true, message: `Agent is ${agent?.status || "unavailable"}.` };

  const { data: activeCall } = await admin.from("dialer_calls").select("*").eq("employee_email", employeeEmail).in("status", ["initiated", "ringing", "answered", "disconnected"]).eq("disposition_required", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (activeCall) return { success: false, active: true, call: activeCall, message: "Finish the active call and save a disposition before dialing again." };

  const { data: mapping } = await admin.from("ringcentral_user_mappings").select("*").eq("employee_email", employeeEmail).eq("enabled", true).maybeSingle();
  if (!mapping) throw new Response(JSON.stringify({ error: "No enabled RingCentral mapping is saved for this employee." }), { status: 409 });

  const { data: queued } = await admin.from("dialer_campaign_accounts").select("*").eq("campaign_id", campaignId).eq("employee_email", employeeEmail).eq("status", "queued").order("sort_order", { ascending: true }).limit(25);
  for (const candidate of queued || []) {
    const { data: account } = await admin.from("accounts").select("*").eq("id", candidate.account_id).maybeSingle();
    if (!account) {
      await admin.from("dialer_campaign_accounts").update({ status: "skipped", last_error: "Account not found", updated_at: new Date().toISOString() }).eq("id", candidate.id);
      continue;
    }

    const compliance = await complianceSnapshot(admin, account);
    const phones = phoneCandidates(account);
    if (!compliance.allowed || !phones.length) {
      const reason = compliance.allowed ? "No callable phone number" : compliance.reasons.join(", ");
      await admin.from("dialer_campaign_accounts").update({
        status: compliance.allowed ? "skipped" : "blocked",
        last_error: reason,
        compliance_snapshot: compliance,
        updated_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      await insertActivity(admin, account.id, "Dialer Compliance Block", `Power dialer skipped account: ${reason}.`, employeeEmail);
      continue;
    }

    const phone = phones[0];
    const now = new Date().toISOString();
    const { data: claimed } = await admin.from("dialer_campaign_accounts").update({
      status: "dialing",
      phone_number: phone.phone,
      phone_slot: phone.slot,
      last_attempt_at: now,
      compliance_snapshot: compliance,
      last_error: null,
      updated_at: now,
    }).eq("id", candidate.id).eq("status", "queued").select("*").maybeSingle();
    if (!claimed) continue;

    const { data: call, error: callError } = await admin.from("dialer_calls").insert({
      campaign_id: campaignId,
      campaign_account_id: candidate.id,
      account_id: account.id,
      employee_email: employeeEmail,
      phone_number: phone.phone,
      ringcentral_extension_id: mapping.ringcentral_extension_id,
      status: "initiated",
      started_at: now,
      disposition_required: true,
    }).select("*").single();
    if (callError) throw callError;

    await setAgentStatus(admin, employeeEmail, "dialing", campaignId, call.id);
    try {
      const payload = await ringCentralFetch(
        employeeEmail,
        "/restapi/v1.0/account/~/extension/~/ring-out",
        "POST",
        {
          from: { phoneNumber: normalizePhone(mapping.ringcentral_forward_phone) },
          to: { phoneNumber: phone.phone },
          playPrompt: false,
        },
      );
      const providerCallId = firstText(payload.id, payload.ringOutId);
      await admin.from("dialer_calls").update({
        provider_call_id: providerCallId || null,
        status: "ringing",
        provider_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq("id", call.id);
      await admin.from("dialer_campaign_accounts").update({ status: "ringing", updated_at: new Date().toISOString() }).eq("id", candidate.id);
      await insertActivity(admin, account.id, "Outbound Call", `RingCentral power dialer started ${phone.phone} for ${employeeEmail}.`, employeeEmail, phone.phone);
      return {
        success: true,
        call: { ...call, provider_call_id: providerCallId, status: "ringing" },
        account: { id: account.id, full_name: account.full_name, account_number: account.account_number },
        campaign: { id: campaign.id, name: campaign.name },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await admin.from("dialer_calls").update({ status: "failed", ended_at: new Date().toISOString(), disposition_required: false, disposition: "Provider Error", disposition_notes: message, updated_at: new Date().toISOString() }).eq("id", call.id);
      await admin.from("dialer_campaign_accounts").update({ status: "failed", last_error: message, attempt_count: Number(candidate.attempt_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", candidate.id);
      await setAgentStatus(admin, employeeEmail, "available", campaignId, null);
      await insertActivity(admin, account.id, "Dialer Provider Error", `RingCentral could not start call: ${message}`, employeeEmail, phone.phone);
      throw error;
    }
  }

  await setAgentStatus(admin, employeeEmail, "unavailable", campaignId, null);
  const { count: remaining } = await admin.from("dialer_campaign_accounts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["queued", "dialing", "ringing", "connected", "wrap_up"]);
  if (!remaining) await admin.from("dialer_campaigns").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaignId);
  return { success: false, empty: true, message: "No callable queued accounts remain for this employee." };
}

async function completeCall(admin: any, actor: any, input: any) {
  const callId = firstText(input.callId);
  if (!callId) throw new Response(JSON.stringify({ error: "callId is required." }), { status: 400 });
  const { data: call } = await admin.from("dialer_calls").select("*").eq("id", callId).maybeSingle();
  if (!call) throw new Response(JSON.stringify({ error: "Dialer call was not found." }), { status: 404 });
  if (!actor.isAdmin && String(call.employee_email).toLowerCase() !== actor.email) throw new Response(JSON.stringify({ error: "You cannot complete another employee's call." }), { status: 403 });

  const endedAt = call.ended_at || new Date().toISOString();
  const started = new Date(call.started_at).getTime();
  const ended = new Date(endedAt).getTime();
  const duration = Math.max(0, Number(input.durationSeconds ?? Math.round((ended - started) / 1000) ?? 0));
  const disposition = firstText(input.disposition, "Completed");
  const notes = firstText(input.notes);

  await admin.from("dialer_calls").update({
    status: "completed",
    ended_at: endedAt,
    duration_seconds: duration,
    disposition_required: false,
    disposition,
    disposition_notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", call.id);

  const { data: campaignAccount } = await admin.from("dialer_campaign_accounts").select("attempt_count").eq("id", call.campaign_account_id).maybeSingle();
  await admin.from("dialer_campaign_accounts").update({
    status: "completed",
    attempt_count: Number(campaignAccount?.attempt_count || 0) + 1,
    last_result: disposition,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", call.campaign_account_id);

  await setAgentStatus(admin, call.employee_email, "available", call.campaign_id, null);
  const { count: remaining } = await admin.from("dialer_campaign_accounts").select("id", { count: "exact", head: true }).eq("campaign_id", call.campaign_id).in("status", ["queued", "dialing", "ringing", "connected", "wrap_up"]);
  if (!remaining) await admin.from("dialer_campaigns").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", call.campaign_id);
  return { success: true, callId, campaignComplete: !remaining };
}

async function campaignControl(admin: any, actor: any, input: any) {
  if (!actor.isAdmin) throw new Response(JSON.stringify({ error: "Administrator access is required." }), { status: 403 });
  const campaignId = firstText(input.campaignId);
  const command = firstText(input.command).toLowerCase();
  if (!campaignId || !["start", "pause", "resume", "stop"].includes(command)) throw new Response(JSON.stringify({ error: "A valid campaignId and command are required." }), { status: 400 });
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (command === "start") Object.assign(patch, { status: "running", started_at: now, paused_at: null, stopped_at: null, completed_at: null });
  if (command === "pause") Object.assign(patch, { status: "paused", paused_at: now });
  if (command === "resume") Object.assign(patch, { status: "running", paused_at: null });
  if (command === "stop") Object.assign(patch, { status: "stopped", stopped_at: now });
  const { data, error } = await admin.from("dialer_campaigns").update(patch).eq("id", campaignId).select("*").single();
  if (error) throw error;
  if (command === "stop" || command === "pause") {
    await admin.from("dialer_agent_status").update({ status: "unavailable", current_call_id: null, updated_at: now }).eq("campaign_id", campaignId).eq("status", "available");
  }
  return { success: true, campaign: data };
}

async function createWebhookSubscription(admin: any, actor: any) {
  if (!actor.isAdmin) throw new Response(JSON.stringify({ error: "Administrator access is required." }), { status: 403 });
  const validationToken = Deno.env.get("RC_WEBHOOK_VALIDATION_TOKEN")?.trim();
  if (!validationToken) throw new Error("RC_WEBHOOK_VALIDATION_TOKEN is missing from LIVE Supabase Edge Function Secrets.");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
  const { data: mappings } = await admin.from("ringcentral_user_mappings").select("employee_email,ringcentral_extension_id").eq("enabled", true).order("employee_email");
  if (!mappings?.length) throw new Error("Save at least one enabled RingCentral employee mapping first.");

  const webhookAddress = `${supabaseUrl}/functions/v1/ringcentral-webhook`;
  const results: any[] = [];
  for (const mapping of mappings) {
    const employeeEmail = String(mapping.employee_email || "").trim().toLowerCase();
    const eventFilters = ["/restapi/v1.0/account/~/extension/~/telephony/sessions"];
    try {
      const payload = await ringCentralFetch(employeeEmail, "/restapi/v1.0/subscription", "POST", {
        eventFilters,
        deliveryMode: {
          transportType: "WebHook",
          address: webhookAddress,
          validationToken,
        },
        expiresIn: 604800,
      });
      const expiresAt = payload.expirationTime || (payload.expiresIn ? new Date(Date.now() + Number(payload.expiresIn) * 1000).toISOString() : null);
      await admin.from("ringcentral_webhook_subscriptions").insert({
        employee_email: employeeEmail,
        ringcentral_subscription_id: firstText(payload.id) || null,
        status: firstText(payload.status, "active"),
        event_filters: eventFilters,
        webhook_address: webhookAddress,
        expires_at: expiresAt,
        provider_payload: payload,
        created_by_email: actor.email,
        updated_at: new Date().toISOString(),
      });
      results.push({ employeeEmail, success: true, subscriptionId: firstText(payload.id), expiresAt });
    } catch (error) {
      results.push({ employeeEmail, success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  const created = results.filter((row) => row.success).length;
  if (!created) throw new Error(`No RingCentral webhooks were created. ${results.map((row) => `${row.employeeEmail}: ${row.error || "failed"}`).join(" | ")}`);
  return { success: true, webhookAddress, subscriptionsCreated: created, totalMappings: mappings.length, results };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient(supabaseUrl, envSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const actor = await authenticate(req, admin);
    const input = await req.json().catch(() => ({}));
    const action = firstText(input.action).toLowerCase();

    if (action === "connection_status") {
      const { data: mappingRows } = await admin.from("ringcentral_user_mappings").select("employee_email").eq("enabled", true).order("employee_email");
      const visibleMappings = actor.isAdmin ? (mappingRows || []) : (mappingRows || []).filter((row: any) => String(row.employee_email).toLowerCase() === actor.email);
      const users: any[] = [];
      for (const mapping of visibleMappings) {
        const employeeEmail = String(mapping.employee_email || "").toLowerCase();
        try {
          await ringCentralAccessToken(employeeEmail);
          users.push({ employeeEmail, connected: true });
        } catch (error) {
          users.push({ employeeEmail, connected: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      const connectedCount = users.filter((row) => row.connected).length;
      return json({
        success: true,
        providerConnected: visibleMappings.length > 0 && connectedCount === visibleMappings.length,
        connectedCount,
        mappingCount: mappingRows?.length || 0,
        users,
        isAdmin: actor.isAdmin,
      });
    }

    if (action === "set_agent_status") {
      const employeeEmail = String(input.employeeEmail || actor.email).toLowerCase();
      if (!actor.isAdmin && employeeEmail !== actor.email) return json({ error: "Employees may update only their own dialer status." }, 403);
      const status = firstText(input.status).toLowerCase();
      if (!["unavailable", "available", "wrap_up"].includes(status)) return json({ error: "Invalid agent status." }, 400);
      const row = await setAgentStatus(admin, employeeEmail, status, firstText(input.campaignId) || null, null);
      return json({ success: true, agent: row });
    }

    if (action === "dispatch_next") return json(await dispatchNext(admin, actor, input));
    if (action === "complete_call") return json(await completeCall(admin, actor, input));
    if (action === "campaign_control") return json(await campaignControl(admin, actor, input));
    if (action === "create_webhook_subscription") return json(await createWebhookSubscription(admin, actor));

    return json({ error: "Unknown dialer action." }, 400);
  } catch (error) {
    if (error instanceof Response) {
      const body = await error.text().catch(() => "");
      return new Response(body || JSON.stringify({ error: "Request rejected." }), { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("RingCentral dialer error", error);
    return json({ error: error instanceof Error ? error.message : "RingCentral dialer request failed." }, 500);
  }
});
