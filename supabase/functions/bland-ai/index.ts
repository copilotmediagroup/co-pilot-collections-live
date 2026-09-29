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

    if (action !== "health") {
      return json({
        error: "Action not enabled",
        message: "Only the non-dialing Bland connection check is enabled at this gate.",
      }, 403);
    }

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
