import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase auth configuration missing" }, 500);

    // Validate the caller's Supabase JWT before exposing any Bland account status.
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    if (!userResponse.ok) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("BLAND_API_KEY");
    if (!apiKey) return json({ connected: false, error: "BLAND_API_KEY is not configured" }, 503);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* health is the safe default */ }
    const action = typeof body.action === "string" ? body.action : "health";

    const allowedTestNumber = "+13322590894";
    if (action === "collector_sandbox") {
      const requested = String(body.phone_number ?? "").replace(/\D/g, "");
      if (requested !== "13322590894" && requested !== "3322590894") return json({ error: "Sandbox number not authorized" }, 403);
      const accountId = String(body.account_id ?? "").trim();
      if (!accountId) return json({ error: "Selected account is required" }, 400);

      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) return json({ error: "Server account lookup unavailable" }, 500);
      const accountResponse = await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=id,state,status,disposition,do_not_call,cease_and_desist,disputed_flag,bankruptcy_flag,deceased_flag,attorney_represented,wrong_number_flag,needs_manager_review,compliance_call_start,compliance_call_end,max_calls_per_day,compliance_time_zone&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const rows = await accountResponse.json().catch(() => []);
      const a = Array.isArray(rows) ? rows[0] : null;
      if (!accountResponse.ok || !a) return json({ error: "Selected account could not be verified" }, 404);

      const blocked = [
        [a.do_not_call, "Do Not Call"], [a.cease_and_desist, "Cease & Desist"],
        [a.disputed_flag, "Disputed / Frozen"], [a.bankruptcy_flag, "Bankruptcy"],
        [a.deceased_flag, "Deceased"], [a.attorney_represented, "Attorney Represented"],
        [a.wrong_number_flag, "Wrong Number"]
      ].filter(([v]) => v === true).map(([, label]) => label);
      const status = String(a.disposition || a.status || "").toLowerCase();
      if (status === "dnc") blocked.push("Do Not Call");
      if (status === "bad number") blocked.push("Wrong Number");
      if (status === "disputed") blocked.push("Disputed / Frozen");
      if (blocked.length) return json({ error: "Compliance preflight blocked", reasons: [...new Set(blocked)] }, 409);
      if (a.needs_manager_review === true) return json({ error: "Manager review required before AI calling" }, 409);

      // This sandbox deliberately does not send debtor PII, account number, SSN, DOB,
      // bank data, creditor, balance, or debtor phone to Bland.
      const response = await fetch("https://api.bland.ai/v1/calls", {
        method: "POST",
        headers: { authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: allowedTestNumber,
          task: "You are testing a collections-assistant workflow using synthetic data only. Say this is a Co Pilot AI collector sandbox. Ask whether you are speaking with the intended test consumer. Do not reveal any debt information before the person confirms they are the intended test consumer. After confirmation, state that this is an attempt to collect a debt and any information obtained will be used for that purpose. Then say the synthetic test account has a balance of $500 with Sample Creditor. Ask whether they want to discuss resolving the sample account. You may discuss a hypothetical payment plan, but you may not take card or bank information, approve a settlement, threaten legal action, misrepresent consequences, or claim a payment has been processed. If asked to dispute, stop collection discussion and say the dispute would be routed for human review. If asked for a settlement, say a human manager must approve it. If asked to stop calls or says wrong number, acknowledge it and end the call. If uncertain, offer human review.",
          first_sentence: "Hello, this is the Co Pilot AI collector sandbox calling with synthetic test information only.",
          wait_for_greeting: true,
          max_duration: 4,
          record: false,
          metadata: { source: "cpcm_collector_sandbox", account_id: accountId }
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return json({ ok: false, error: data?.message || "Bland collector sandbox failed", status: response.status }, 502);
      return json({ ok: true, provider: "bland", call_id: data?.call_id ?? null, status: data?.status ?? "queued", mode: "collector_sandbox_synthetic" });
    }

    if (action === "manual_test") {
      const requested = String(body.phone_number ?? "").replace(/\D/g, "");
      if (requested !== "13322590894" && requested !== "3322590894") {
        return json({ error: "Test number not authorized" }, 403);
      }
      const response = await fetch("https://api.bland.ai/v1/calls", {
        method: "POST",
        headers: { authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: allowedTestNumber,
          task: "This is a private Co Pilot Collections Manager integration test. Confirm you reached the authorized test phone, briefly explain that this is a Bland AI test call, answer simple questions about the test, and do not discuss or attempt to collect any debt.",
          first_sentence: "Hello, this is the authorized Co Pilot Bland AI test call.",
          wait_for_greeting: true,
          max_duration: 2,
          record: false,
          metadata: { source: "cpcm_manual_test_gate" }
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return json({ ok: false, error: data?.message || "Bland test call failed", status: response.status }, 502);
      return json({ ok: true, provider: "bland", call_id: data?.call_id ?? null, status: data?.status ?? "queued", message: data?.message ?? "Test call queued." });
    }

    if (action !== "health") return json({ error: "Action not enabled" }, 403);

    const response = await fetch("https://api.bland.ai/v1/me", {
      method: "GET",
      headers: { authorization: apiKey },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        connected: false,
        provider: "bland",
        status: response.status,
        error: "Bland authentication failed",
      }, 502);
    }

    return json({
      connected: true,
      provider: "bland",
      account_status: data?.status ?? null,
      billing: data?.billing ?? null,
      total_calls: data?.total_calls ?? null,
      dialing_enabled: false,
      mode: "connection_check_only",
    });
  } catch (error) {
    console.error("bland-ai error", error);
    return json({ connected: false, error: "Bland connection check failed" }, 500);
  }
});
