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
