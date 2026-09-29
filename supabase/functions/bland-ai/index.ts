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

const digits10 = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};
const stateZones: Record<string, string[]> = {
  FL:["America/New_York","America/Chicago"], IN:["America/New_York","America/Chicago"], KY:["America/New_York","America/Chicago"],
  TN:["America/New_York","America/Chicago"], MI:["America/New_York","America/Chicago"], ID:["America/Denver","America/Los_Angeles"],
  OR:["America/Los_Angeles","America/Denver"], ND:["America/Chicago","America/Denver"], SD:["America/Chicago","America/Denver"],
  NE:["America/Chicago","America/Denver"], KS:["America/Chicago","America/Denver"], TX:["America/Chicago","America/Denver"],
  AK:["America/Anchorage"], HI:["Pacific/Honolulu"], AZ:["America/Phoenix"],
  CT:["America/New_York"], DE:["America/New_York"], DC:["America/New_York"], GA:["America/New_York"], ME:["America/New_York"],
  MD:["America/New_York"], MA:["America/New_York"], NH:["America/New_York"], NJ:["America/New_York"], NY:["America/New_York"],
  NC:["America/New_York"], OH:["America/New_York"], PA:["America/New_York"], RI:["America/New_York"], SC:["America/New_York"],
  VT:["America/New_York"], VA:["America/New_York"], WV:["America/New_York"],
  AL:["America/Chicago"], AR:["America/Chicago"], IL:["America/Chicago"], IA:["America/Chicago"], LA:["America/Chicago"],
  MN:["America/Chicago"], MS:["America/Chicago"], MO:["America/Chicago"], OK:["America/Chicago"], WI:["America/Chicago"],
  CO:["America/Denver"], MT:["America/Denver"], NM:["America/Denver"], UT:["America/Denver"], WY:["America/Denver"],
  CA:["America/Los_Angeles"], NV:["America/Los_Angeles"], WA:["America/Los_Angeles"]
};
const minuteInZone = (zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const h=Number(parts.find(x=>x.type==="hour")?.value ?? -1), m=Number(parts.find(x=>x.type==="minute")?.value ?? -1);
  return h*60+m;
};
const timeMinutes = (v: unknown, fallback: number) => {
  const m=String(v ?? "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1])*60+Number(m[2]) : fallback;
};

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
    const authUser = await userResponse.json().catch(() => ({}));
    const authEmail = String(authUser?.email ?? "").trim().toLowerCase();

    const apiKey = Deno.env.get("BLAND_API_KEY");
    if (!apiKey) return json({ connected: false, error: "BLAND_API_KEY is not configured" }, 503);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* health is the safe default */ }
    const action = typeof body.action === "string" ? body.action : "health";
    const adminOnlyActions = new Set(["manual_test", "collector_sandbox", "sandbox_result"]);
    if (adminOnlyActions.has(action) && authEmail !== "afinch2678@gmail.com") {
      return json({ error: "Admin authorization required" }, 403);
    }

    const allowedTestNumber = "+13322590894";

    // Future real-account calling must pass this server-side preflight. No real dial action is enabled yet.
    if (action === "real_call_preflight") {
      if (authEmail !== "afinch2678@gmail.com") return json({ error: "Admin authorization required" }, 403);
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) return json({ error: "Server account lookup unavailable" }, 500);
      const accountId=String(body.account_id ?? "").trim(), requested=digits10(body.phone_number);
      if (!accountId || requested.length!==10) return json({ error: "Account and valid phone are required" }, 400);
      const select="id,state,status,disposition,do_not_call,cease_and_desist,disputed_flag,bankruptcy_flag,deceased_flag,attorney_represented,wrong_number_flag,needs_manager_review,compliance_call_start,compliance_call_end,max_calls_per_day,compliance_time_zone,phone1,phone1_status,phone2,phone2_status,phone3,phone3_status,phone4,phone4_status,phone5,phone5_status,phone6,phone6_status,phone7,phone7_status,phone8,phone8_status,phone9,phone9_status,phone10,phone10_status";
      const ar=await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=${select}&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const rows=await ar.json().catch(()=>[]), a=Array.isArray(rows)?rows[0]:null;
      if(!ar.ok||!a)return json({error:"Selected account could not be verified"},404);
      const reasons:string[]=[];
      const blocked=[[a.do_not_call,"Do Not Call"],[a.cease_and_desist,"Cease & Desist"],[a.disputed_flag,"Disputed / Frozen"],[a.bankruptcy_flag,"Bankruptcy"],[a.deceased_flag,"Deceased"],[a.attorney_represented,"Attorney Represented"],[a.wrong_number_flag,"Wrong Number"]];
      blocked.forEach(([v,l])=>{if(v===true)reasons.push(String(l))});
      const st=String(a.disposition||a.status||"").toLowerCase();
      if(["dnc","bad number","disputed"].includes(st))reasons.push("Blocked account disposition");
      if(a.needs_manager_review===true)reasons.push("Manager review required");
      let slot=0;
      for(let i=1;i<=10;i++)if(digits10(a["phone"+i])===requested){slot=i;break}
      if(!slot)reasons.push("Phone does not belong to selected account");
      else if(/bad|wrong|invalid|dnc|do not call/i.test(String(a["phone"+slot+"_status"]??"")))reasons.push("Selected phone status is blocked");
      const explicit=String(a.compliance_time_zone??"").trim();
      const zones=explicit?[explicit]:(stateZones[String(a.state??"").trim().toUpperCase()]||[]);
      if(!zones.length)reasons.push("Compliance timezone is unknown");
      else {
        const start=Math.max(8*60,timeMinutes(a.compliance_call_start,8*60));
        const end=Math.min(21*60,timeMinutes(a.compliance_call_end,21*60));
        if(start>=end||zones.some(z=>{try{const n=minuteInZone(z);return n<start||n>=end}catch{return true}}))reasons.push("Outside permitted call window");
      }
      const max=Math.max(1,Number(a.max_calls_per_day||2));
      const since=new Date(Date.now()-24*60*60*1000).toISOString();
      const cr=await fetch(`${supabaseUrl}/rest/v1/call_results?account_id=eq.${encodeURIComponent(accountId)}&direction=eq.outbound&created_at=gte.${encodeURIComponent(since)}&select=id`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const calls=await cr.json().catch(()=>[]);
      if(!cr.ok)reasons.push("Daily call history could not be verified");
      else if(Array.isArray(calls)&&calls.length>=max)reasons.push(`Daily call limit reached (${calls.length}/${max})`);
      const sr=await fetch(`${supabaseUrl}/rest/v1/ai_collector_script_profiles?approved_for_real_calls=eq.true&select=id,profile_name,version,identity_prompt,initial_disclosure,subsequent_disclosure,dispute_instruction,dnc_instruction,settlement_instruction,payment_instruction,human_escalation_instruction&order=updated_at.desc&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const scripts=await sr.json().catch(()=>[]), script=Array.isArray(scripts)?scripts[0]:null;
      if(!sr.ok)reasons.push("AI script approval could not be verified");
      else if(!script)reasons.push("No AI collector script is approved for real calls");
      else if(!String(script.identity_prompt||"").trim()||!String(script.initial_disclosure||"").trim()||!String(script.subsequent_disclosure||"").trim())reasons.push("Approved AI script is missing required identity/disclosure fields");
      if(reasons.length)return json({ok:false,allowed:false,reasons:[...new Set(reasons)]},409);
      return json({ok:true,allowed:true,account_id:accountId,phone_last4:requested.slice(-4),phone_slot:slot,max_calls_per_day:max,script_profile:{id:script.id,name:script.profile_name,version:script.version}});
    }

    if (action === "sandbox_result") {
      const callId = String(body.call_id ?? "").trim();
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(callId)) return json({ error: "Valid call ID required" }, 400);
      const response = await fetch("https://api.bland.ai/v1/calls/" + encodeURIComponent(callId), {
        headers: { authorization: apiKey },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return json({ ok: false, error: data?.message || "Bland call lookup failed", status: response.status }, 502);
      const transcript = String(data?.concatenated_transcript ?? "").slice(0, 12000);
      const summary = String(data?.summary ?? "").slice(0, 4000);
      return json({
        ok: true,
        call_id: data?.call_id ?? callId,
        status: data?.status ?? null,
        completed: data?.completed === true,
        answered_by: data?.answered_by ?? null,
        call_length: data?.call_length ?? null,
        summary,
        transcript,
        recording_available: Boolean(data?.recording_url),
        price: data?.price ?? null,
      });
    }

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
