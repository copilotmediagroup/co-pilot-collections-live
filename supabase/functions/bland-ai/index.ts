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
    const adminOnlyActions = new Set(["manual_test", "collector_sandbox", "sandbox_result", "prepare_real_call", "authorize_real_call", "real_call_dry_run", "real_call_send", "pipeline_test"]);
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
      const disposition=String(a.disposition||"").toLowerCase(),accountStatus=String(a.status||"").toLowerCase();
      if(["dnc","bad number","disputed"].includes(disposition))reasons.push("Blocked account disposition");
      if(["dnc","bad number","disputed"].includes(accountStatus))reasons.push("Blocked account status");
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
      const cr=await fetch(`${supabaseUrl}/rest/v1/call_results?account_id=eq.${encodeURIComponent(accountId)}&direction=eq.outbound&dialed_at=not.is.null&created_at=gte.${encodeURIComponent(since)}&select=id`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const calls=await cr.json().catch(()=>[]);
      if(!cr.ok)reasons.push("Daily call history could not be verified");
      else if(Array.isArray(calls)&&calls.length>=max)reasons.push(`Daily call limit reached (${calls.length}/${max})`);
      const cmr=await fetch(`${supabaseUrl}/rest/v1/account_communication_compliance?account_id=eq.${encodeURIComponent(accountId)}&select=first_debt_communication_at,validation_notice_sent_at,validation_notice_method,validation_notice_source&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const cmRows=await cmr.json().catch(()=>[]), comm=Array.isArray(cmRows)?cmRows[0]:null;
      if(!cmr.ok)reasons.push("Communication compliance history could not be verified");
      else if(!comm)reasons.push("First-contact / validation-notice state is unknown");
      else if(!comm.validation_notice_sent_at)reasons.push("Validation notice is not recorded as sent");
      const communicationType=comm?.first_debt_communication_at?"subsequent":"initial";

      const sr=await fetch(`${supabaseUrl}/rest/v1/ai_collector_script_profiles?approved_for_real_calls=eq.true&select=id,profile_name,version,identity_prompt,initial_disclosure,subsequent_disclosure,dispute_instruction,dnc_instruction,settlement_instruction,payment_instruction,human_escalation_instruction,conversation_policy&order=updated_at.desc&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const scripts=await sr.json().catch(()=>[]), script=Array.isArray(scripts)?scripts[0]:null;
      if(!sr.ok)reasons.push("AI script approval could not be verified");
      else if(!script)reasons.push("No AI collector script is approved for real calls");
      else if(!String(script.identity_prompt||"").trim()||!String(script.initial_disclosure||"").trim()||!String(script.subsequent_disclosure||"").trim())reasons.push("Approved AI script is missing required identity/disclosure fields");
      if(reasons.length)return json({ok:false,allowed:false,reasons:[...new Set(reasons)]},409);
      return json({ok:true,allowed:true,account_id:accountId,phone_last4:requested.slice(-4),phone_slot:slot,max_calls_per_day:max,communication_type:communicationType,validation_notice:{sent_at:comm.validation_notice_sent_at,method:comm.validation_notice_method||null,source:comm.validation_notice_source||null},script_profile:{id:script.id,name:script.profile_name,version:script.version,disclosure_type:communicationType}});
    }

    if (action === "prepare_real_call") {
      const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if(!serviceKey)return json({error:"Server preparation unavailable"},500);
      const accountId=String(body.account_id??"").trim(), requested=digits10(body.phone_number);
      if(!accountId||requested.length!==10)return json({error:"Account and valid phone are required"},400);
      const select="id,first_name,original_creditor,type_of_debt,current_balance,state,status,disposition,do_not_call,cease_and_desist,disputed_flag,bankruptcy_flag,deceased_flag,attorney_represented,wrong_number_flag,needs_manager_review,compliance_call_start,compliance_call_end,max_calls_per_day,compliance_time_zone,phone1,phone1_status,phone2,phone2_status,phone3,phone3_status,phone4,phone4_status,phone5,phone5_status,phone6,phone6_status,phone7,phone7_status,phone8,phone8_status,phone9,phone9_status,phone10,phone10_status";
      const ar=await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=${select}&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const rows=await ar.json().catch(()=>[]),a=Array.isArray(rows)?rows[0]:null;if(!ar.ok||!a)return json({error:"Selected account could not be verified"},404);
      const reasons:string[]=[];
      [[a.do_not_call,"Do Not Call"],[a.cease_and_desist,"Cease & Desist"],[a.disputed_flag,"Disputed / Frozen"],[a.bankruptcy_flag,"Bankruptcy"],[a.deceased_flag,"Deceased"],[a.attorney_represented,"Attorney Represented"],[a.wrong_number_flag,"Wrong Number"]].forEach(([v,l])=>{if(v===true)reasons.push(String(l))});
      if(a.needs_manager_review===true)reasons.push("Manager review required");
      if(["dnc","bad number","disputed"].includes(String(a.disposition||"").toLowerCase()))reasons.push("Blocked account disposition");
      if(["dnc","bad number","disputed"].includes(String(a.status||"").toLowerCase()))reasons.push("Blocked account status");
      let slot=0;for(let i=1;i<=10;i++)if(digits10(a["phone"+i])===requested){slot=i;break}
      if(!slot)reasons.push("Phone does not belong to selected account");else if(/bad|wrong|invalid|dnc|do not call/i.test(String(a["phone"+slot+"_status"]??"")))reasons.push("Selected phone status is blocked");
      const zones=String(a.compliance_time_zone??"").trim()?[String(a.compliance_time_zone).trim()]:(stateZones[String(a.state??"").trim().toUpperCase()]||[]);
      const start=Math.max(480,timeMinutes(a.compliance_call_start,480)),end=Math.min(1260,timeMinutes(a.compliance_call_end,1260));
      if(!zones.length)reasons.push("Compliance timezone is unknown");else if(start>=end||zones.some(z=>{try{const n=minuteInZone(z);return n<start||n>=end}catch{return true}}))reasons.push("Outside permitted call window");
      const max=Math.max(1,Number(a.max_calls_per_day||2)),since=new Date(Date.now()-86400000).toISOString();
      const cr=await fetch(`${supabaseUrl}/rest/v1/call_results?account_id=eq.${encodeURIComponent(accountId)}&direction=eq.outbound&dialed_at=not.is.null&created_at=gte.${encodeURIComponent(since)}&select=id`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const calls=await cr.json().catch(()=>[]);if(!cr.ok)reasons.push("Daily call history could not be verified");else if(Array.isArray(calls)&&calls.length>=max)reasons.push(`Daily call limit reached (${calls.length}/${max})`);
      const cmr=await fetch(`${supabaseUrl}/rest/v1/account_communication_compliance?account_id=eq.${encodeURIComponent(accountId)}&select=first_debt_communication_at,validation_notice_sent_at,validation_notice_method,validation_notice_source&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const cmRows=await cmr.json().catch(()=>[]),comm=Array.isArray(cmRows)?cmRows[0]:null;if(!cmr.ok)reasons.push("Communication compliance history could not be verified");else if(!comm)reasons.push("First-contact / validation-notice state is unknown");else if(!comm.validation_notice_sent_at)reasons.push("Validation notice is not recorded as sent");
      const communicationType=comm?.first_debt_communication_at?"subsequent":"initial";
      const sr=await fetch(`${supabaseUrl}/rest/v1/ai_collector_script_profiles?approved_for_real_calls=eq.true&select=*&order=updated_at.desc&limit=1`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
      const scripts=await sr.json().catch(()=>[]),script=Array.isArray(scripts)?scripts[0]:null;if(!sr.ok||!script)reasons.push("No approved AI collector script is available");
      if(reasons.length)return json({ok:false,prepared:false,reasons:[...new Set(reasons)]},409);
      const identityVerificationToken=crypto.randomUUID();
      const payload={first_name:String(a.first_name||""),original_creditor:String(a.original_creditor||""),debt_type:String(a.type_of_debt||""),current_balance:Number(a.current_balance??0),destination_phone:"+1"+requested};
      const scriptSnapshot={profile_id:script.id,profile_name:script.profile_name,version:script.version,identity_prompt:script.identity_prompt,disclosure:communicationType==="initial"?script.initial_disclosure:script.subsequent_disclosure,dispute_instruction:script.dispute_instruction,dnc_instruction:script.dnc_instruction,settlement_instruction:script.settlement_instruction,payment_instruction:script.payment_instruction,human_escalation_instruction:script.human_escalation_instruction,conversation_policy:script.conversation_policy||{},identity_verification_policy:script.identity_verification_policy||{}};
      const preflight={checked_at:new Date().toISOString(),phone_slot:slot,phone_last4:requested.slice(-4),communication_type:communicationType,validation_notice_sent_at:comm.validation_notice_sent_at,validation_notice_method:comm.validation_notice_method||null,validation_notice_source:comm.validation_notice_source||null,max_calls_per_day:max,rolling_24h_outbound_count:Array.isArray(calls)?calls.length:null,identity_verification_token:identityVerificationToken};
      const ir=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts`,{method:"POST",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify([{account_id:accountId,requested_phone_last4:requested.slice(-4),phone_slot:slot,communication_type:communicationType,script_profile_id:script.id,script_profile_name:script.profile_name,script_version:script.version,script_snapshot:scriptSnapshot,payload_snapshot:payload,preflight_snapshot:preflight,status:"prepared",created_by_email:authEmail}])});
      const ins=await ir.json().catch(()=>[]),attempt=Array.isArray(ins)?ins[0]:null;if(!ir.ok||!attempt)return json({error:"Prepared attempt could not be recorded"},500);
      const safePayload={...payload,destination_phone:"***-***-"+requested.slice(-4)};
      return json({ok:true,prepared:true,attempt_id:attempt.id,status:"prepared",payload:safePayload,script:{name:script.profile_name,version:script.version,communication_type:communicationType,disclosure:scriptSnapshot.disclosure},message:"Prepared only. No Bland outbound request was made."});
    }

    if (action === "authorize_real_call") {
      const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),attemptId=String(body.attempt_id??"").trim();
      if(!serviceKey||!/^[0-9a-f-]{36}$/i.test(attemptId))return json({error:"Valid prepared attempt is required"},400);
      const hr={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
      const rr=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&select=*&limit=1`,{headers:hr});
      const rws=await rr.json().catch(()=>[]),attempt=Array.isArray(rws)?rws[0]:null;if(!rr.ok||!attempt)return json({error:"Prepared attempt not found"},404);
      if(!["prepared","authorized"].includes(String(attempt.status)))return json({error:"Attempt is not authorizable",status:attempt.status},409);
      const ar=await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(attempt.account_id)}&select=id,state,status,disposition,do_not_call,cease_and_desist,disputed_flag,bankruptcy_flag,deceased_flag,attorney_represented,wrong_number_flag,needs_manager_review,compliance_call_start,compliance_call_end,max_calls_per_day,compliance_time_zone,phone1,phone1_status,phone2,phone2_status,phone3,phone3_status,phone4,phone4_status,phone5,phone5_status,phone6,phone6_status,phone7,phone7_status,phone8,phone8_status,phone9,phone9_status,phone10,phone10_status&limit=1`,{headers:hr});
      const ars=await ar.json().catch(()=>[]),acct=Array.isArray(ars)?ars[0]:null;if(!ar.ok||!acct)return json({error:"Account revalidation failed"},409);
      const reasons:string[]=[];[[acct.do_not_call,"Do Not Call"],[acct.cease_and_desist,"Cease & Desist"],[acct.disputed_flag,"Disputed / Frozen"],[acct.bankruptcy_flag,"Bankruptcy"],[acct.deceased_flag,"Deceased"],[acct.attorney_represented,"Attorney Represented"],[acct.wrong_number_flag,"Wrong Number"]].forEach(([v,l])=>{if(v===true)reasons.push(String(l))});
      if(acct.needs_manager_review===true)reasons.push("Manager review required");
      if(["dnc","bad number","disputed"].includes(String(acct.disposition||"").toLowerCase()))reasons.push("Blocked account disposition");
      if(["dnc","bad number","disputed"].includes(String(acct.status||"").toLowerCase()))reasons.push("Blocked account status");
      const slot=Number(attempt.phone_slot||0),dest=digits10(attempt.payload_snapshot?.destination_phone);if(!slot||digits10(acct["phone"+slot])!==dest)reasons.push("Prepared phone no longer matches account");else if(/bad|wrong|invalid|dnc|do not call/i.test(String(acct["phone"+slot+"_status"]??"")))reasons.push("Prepared phone is now blocked");
      const zones=String(acct.compliance_time_zone??"").trim()?[String(acct.compliance_time_zone).trim()]:(stateZones[String(acct.state??"").trim().toUpperCase()]||[]),start=Math.max(480,timeMinutes(acct.compliance_call_start,480)),end=Math.min(1260,timeMinutes(acct.compliance_call_end,1260));
      if(!zones.length||start>=end||zones.some(z=>{try{const n=minuteInZone(z);return n<start||n>=end}catch{return true}}))reasons.push("Outside permitted call window");
      const max=Math.max(1,Number(acct.max_calls_per_day||2)),since=new Date(Date.now()-86400000).toISOString();
      const cr=await fetch(`${supabaseUrl}/rest/v1/call_results?account_id=eq.${encodeURIComponent(attempt.account_id)}&direction=eq.Outbound&created_at=gte.${encodeURIComponent(since)}&select=id,attempt_id`,{headers:hr});const calls=await cr.json().catch(()=>[]);
      const otherCalls=Array.isArray(calls)?calls.filter((x:any)=>String(x.attempt_id||"")!==attemptId):[];if(!cr.ok)reasons.push("Daily call history could not be revalidated");else if(otherCalls.length>=max)reasons.push(`Daily call limit reached (${otherCalls.length}/${max})`);
      const sr=await fetch(`${supabaseUrl}/rest/v1/ai_collector_script_profiles?id=eq.${encodeURIComponent(attempt.script_profile_id)}&approved_for_real_calls=eq.true&select=id,version&limit=1`,{headers:hr});const ss=await sr.json().catch(()=>[]),script=Array.isArray(ss)?ss[0]:null;if(!sr.ok||!script||Number(script.version)!==Number(attempt.script_version))reasons.push("Prepared script version is no longer approved/current");
      if(reasons.length)return json({ok:false,authorized:false,reasons:[...new Set(reasons)]},409);
      const rpc=await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_authorize_ai_call_attempt`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_admin_email:authEmail})});
      const out=await rpc.json().catch(()=>[]),row=Array.isArray(out)?out[0]:null;if(!rpc.ok||!row)return json({error:"Atomic authorization failed"},500);
      return json({ok:true,authorized:true,attempt_id:attemptId,call_result_id:row.call_result_id,status:"authorized",provider_send_enabled:false,message:"Authorized and reserved. Bland outbound send remains disabled."});
    }

    if (action === "real_call_dry_run") {
      const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),attemptId=String(body.attempt_id??"").trim();
      if(!serviceKey||!/^[0-9a-f-]{36}$/i.test(attemptId))return json({error:"Valid authorized attempt is required"},400);
      const hr={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
      const rr=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&select=*&limit=1`,{headers:hr});
      const rows=await rr.json().catch(()=>[]),attempt=Array.isArray(rows)?rows[0]:null;if(!rr.ok||!attempt)return json({error:"Authorized attempt not found"},404);
      if(String(attempt.status)!=="authorized")return json({error:"Attempt must be authorized before dry run",status:attempt.status},409);
      const vr=await fetch(`${supabaseUrl}/rest/v1/call_results?attempt_id=eq.${encodeURIComponent(attemptId)}&attempt_status=eq.authorized&select=id&limit=1`,{headers:hr});
      const vrows=await vr.json().catch(()=>[]);if(!vr.ok||!Array.isArray(vrows)||!vrows[0])return json({error:"Atomic authorization reservation is missing"},409);
      const p=attempt.payload_snapshot||{},s=attempt.script_snapshot||{};
      const firstName=String(p.first_name||"").trim(),creditor=String(p.original_creditor||"").trim(),debtType=String(p.debt_type||"").trim(),balance=Number(p.current_balance||0),destination=String(p.destination_phone||"");
      if(digits10(destination).length!==10)return json({error:"Snapshot destination is invalid"},409);
      if(!String(s.identity_prompt||"").trim()||!String(s.disclosure||"").trim())return json({error:"Snapshot identity/disclosure instructions are incomplete"},409);
      const task=[
        "You are an AI collections assistant operating under a locked, admin-approved script snapshot.",
        "IDENTITY GATE: "+String(s.identity_prompt),
        "Before identity is verified, do not reveal the creditor, debt type, balance, account existence, or any other debt-specific information.",
        "After identity is verified, state this approved disclosure exactly: "+String(s.disclosure),
        `Verified-consumer account context: first name ${firstName||"[not provided]"}; original creditor ${creditor||"[not provided]"}; debt type ${debtType||"[not provided]"}; current balance $${balance.toFixed(2)}.`,
        "DISPUTE: "+String(s.dispute_instruction||"Stop collection discussion and route for human review."),
        "DO NOT CALL: "+String(s.dnc_instruction||"Acknowledge the request and end the collection discussion."),
        "SETTLEMENT: "+String(s.settlement_instruction||"Do not approve an unapproved settlement; route for manager review."),
        "PAYMENT SECURITY: "+String(s.payment_instruction||"Do not collect payment credentials in this call."),
        "HUMAN ESCALATION: "+String(s.human_escalation_instruction||"Route to human review when requested or uncertain."),
        "CONVERSATION POLICY: "+JSON.stringify(s.conversation_policy||{}),
        "Never request or repeat SSN, date of birth, bank account number, routing number, card number, or other payment credentials."
      ].join("\n\n");
      const providerPayload={phone_number:destination,task,first_sentence:`Hello, may I speak with ${firstName||"the intended consumer"}?`,wait_for_greeting:true,max_duration:4,record:false,metadata:{source:"cpcm_real_call",attempt_id:attemptId,script_profile_id:attempt.script_profile_id,script_version:attempt.script_version,communication_type:attempt.communication_type}};
      const redacted={...providerPayload,phone_number:"***-***-"+digits10(destination).slice(-4)};
      const patch=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}`,{method:"PATCH",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({updated_at:new Date().toISOString()})});
      if(!patch.ok)return json({error:"Dry-run audit touch failed"},500);
      return json({ok:true,dry_run:true,attempt_id:attemptId,provider:"bland",provider_send_enabled:false,request:redacted,message:"Dry run only. No request was sent to Bland."});
    }

    if (action === "real_call_send") {
      const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),attemptId=String(body.attempt_id??"").trim();
      if(!serviceKey||!/^[0-9a-f-]{36}$/i.test(attemptId))return json({error:"Valid authorized attempt is required"},400);
      const hr={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
      const cfg=await fetch(`${supabaseUrl}/rest/v1/ai_call_runtime_config?id=eq.true&select=real_provider_send_enabled&limit=1`,{headers:hr});
      const cfgRows=await cfg.json().catch(()=>[]),enabled=cfg.ok&&Array.isArray(cfgRows)&&cfgRows[0]?.real_provider_send_enabled===true;
      if(!enabled)return json({ok:false,sent:false,provider_send_enabled:false,error:"Real provider send is disabled by the server kill switch"},423);
      const cidr=await fetch(`${supabaseUrl}/rest/v1/ai_caller_id_config?id=eq.true&select=phone_number,verification_status,enabled_for_real_calls&limit=1`,{headers:hr});
      const cidRows=await cidr.json().catch(()=>[]),callerCfg=Array.isArray(cidRows)?cidRows[0]:null;
      if(!cidr.ok||!callerCfg||callerCfg.verification_status!=="verified"||callerCfg.enabled_for_real_calls!==true||digits10(callerCfg.phone_number).length!==10)return json({ok:false,sent:false,error:"Verified production caller ID is not enabled"},423);
      const callerId=String(callerCfg.phone_number);
      const pcr=await fetch(`${supabaseUrl}/rest/v1/ai_bland_pathway_config?id=eq.true&select=pathway_id,verification_status,enabled_for_real_calls&limit=1`,{headers:hr});
      const pcRows=await pcr.json().catch(()=>[]),pathwayCfg=Array.isArray(pcRows)?pcRows[0]:null;
      if(!pcr.ok||!pathwayCfg||pathwayCfg.verification_status!=="synthetic_verified"||pathwayCfg.enabled_for_real_calls!==true||!String(pathwayCfg.pathway_id||"").trim())return json({ok:false,sent:false,error:"Verified Bland collector Pathway is not enabled"},423);
      return json({ok:false,sent:false,error:"Legacy static-task real-call send is permanently blocked. Pathway invocation must replace it before production calling."},423);
      const rr=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&select=*&limit=1`,{headers:hr});
      const rows=await rr.json().catch(()=>[]),attempt=Array.isArray(rows)?rows[0]:null;if(!rr.ok||!attempt)return json({error:"Authorized attempt not found"},404);
      if(String(attempt.status)==="sent"&&attempt.provider_call_id)return json({ok:true,sent:true,idempotent:true,attempt_id:attemptId,provider_call_id:attempt.provider_call_id});
      if(String(attempt.status)!=="authorized")return json({error:"Attempt is not sendable",status:attempt.status},409);
      const sendReasons:string[]=[];
      const sar=await fetch(`${supabaseUrl}/rest/v1/accounts?id=eq.${encodeURIComponent(attempt.account_id)}&select=id,state,status,disposition,do_not_call,cease_and_desist,disputed_flag,bankruptcy_flag,deceased_flag,attorney_represented,wrong_number_flag,needs_manager_review,compliance_call_start,compliance_call_end,max_calls_per_day,compliance_time_zone,phone1,phone1_status,phone2,phone2_status,phone3,phone3_status,phone4,phone4_status,phone5,phone5_status,phone6,phone6_status,phone7,phone7_status,phone8,phone8_status,phone9,phone9_status,phone10,phone10_status&limit=1`,{headers:hr});
      const sars=await sar.json().catch(()=>[]),current=Array.isArray(sars)?sars[0]:null;
      if(!sar.ok||!current)sendReasons.push("Account could not be revalidated immediately before send");
      if(current){
        [[current.do_not_call,"Do Not Call"],[current.cease_and_desist,"Cease & Desist"],[current.disputed_flag,"Disputed / Frozen"],[current.bankruptcy_flag,"Bankruptcy"],[current.deceased_flag,"Deceased"],[current.attorney_represented,"Attorney Represented"],[current.wrong_number_flag,"Wrong Number"]].forEach(([v,l])=>{if(v===true)sendReasons.push(String(l))});
        if(current.needs_manager_review===true)sendReasons.push("Manager review required");
        if(["dnc","bad number","disputed"].includes(String(current.disposition||"").toLowerCase()))sendReasons.push("Blocked account disposition");
        if(["dnc","bad number","disputed"].includes(String(current.status||"").toLowerCase()))sendReasons.push("Blocked account status");
        const slot=Number(attempt.phone_slot||0),dest=digits10(attempt.payload_snapshot?.destination_phone);
        if(!slot||digits10(current["phone"+slot])!==dest)sendReasons.push("Prepared phone no longer matches account");
        else if(/bad|wrong|invalid|dnc|do not call/i.test(String(current["phone"+slot+"_status"]??"")))sendReasons.push("Prepared phone is now blocked");
        const zones=String(current.compliance_time_zone??"").trim()?[String(current.compliance_time_zone).trim()]:(stateZones[String(current.state??"").trim().toUpperCase()]||[]);
        const start=Math.max(480,timeMinutes(current.compliance_call_start,480)),end=Math.min(1260,timeMinutes(current.compliance_call_end,1260));
        if(!zones.length||start>=end||zones.some(z=>{try{const n=minuteInZone(z);return n<start||n>=end}catch{return true}}))sendReasons.push("Outside permitted call window");
        const max=Math.max(1,Number(current.max_calls_per_day||2)),since=new Date(Date.now()-86400000).toISOString();
        const scr=await fetch(`${supabaseUrl}/rest/v1/call_results?account_id=eq.${encodeURIComponent(attempt.account_id)}&direction=eq.Outbound&dialed_at=not.is.null&created_at=gte.${encodeURIComponent(since)}&select=id,attempt_id`,{headers:hr});
        const scalls=await scr.json().catch(()=>[]),other=Array.isArray(scalls)?scalls.filter((x:any)=>String(x.attempt_id||"")!==attemptId):[];
        if(!scr.ok)sendReasons.push("Daily call history could not be revalidated immediately before send");else if(other.length>=max)sendReasons.push(`Daily call limit reached (${other.length}/${max})`);
      }
      const ssr=await fetch(`${supabaseUrl}/rest/v1/ai_collector_script_profiles?id=eq.${encodeURIComponent(attempt.script_profile_id)}&approved_for_real_calls=eq.true&select=id,version&limit=1`,{headers:hr});
      const ssrows=await ssr.json().catch(()=>[]),currentScript=Array.isArray(ssrows)?ssrows[0]:null;
      if(!ssr.ok||!currentScript||Number(currentScript.version)!==Number(attempt.script_version))sendReasons.push("Prepared script version is no longer approved/current");
      if(sendReasons.length)return json({ok:false,sent:false,reasons:[...new Set(sendReasons)]},409);
      const claim=await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_claim_ai_call_send`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_admin_email:authEmail})});
      if(!claim.ok)return json({error:"Atomic send claim failed"},409);
      const p=attempt.payload_snapshot||{},s=attempt.script_snapshot||{},destination=String(p.destination_phone||""),firstName=String(p.first_name||"").trim(),balance=Number(p.current_balance||0);
      const task=["You are an AI collections assistant operating under a locked, admin-approved script snapshot.","IDENTITY GATE: "+String(s.identity_prompt||""),"Before identity is verified, do not reveal the creditor, debt type, balance, account existence, or any other debt-specific information.","After identity is verified, state this approved disclosure exactly: "+String(s.disclosure||""),`Verified-consumer account context: first name ${firstName||"[not provided]"}; original creditor ${String(p.original_creditor||"")||"[not provided]"}; debt type ${String(p.debt_type||"")||"[not provided]"}; current balance $${balance.toFixed(2)}.`,"DISPUTE: "+String(s.dispute_instruction||""),"DO NOT CALL: "+String(s.dnc_instruction||""),"SETTLEMENT: "+String(s.settlement_instruction||""),"PAYMENT SECURITY: "+String(s.payment_instruction||""),"HUMAN ESCALATION: "+String(s.human_escalation_instruction||""),"CONVERSATION POLICY: "+JSON.stringify(s.conversation_policy||{}),"Never request or repeat SSN, date of birth, bank account number, routing number, card number, or other payment credentials."].join("\n\n");
      const webhook=`${supabaseUrl}/functions/v1/bland-call-status`;
      const providerPayload={phone_number:destination,from:callerId,task,first_sentence:`Hello, may I speak with ${firstName||"the intended consumer"}?`,wait_for_greeting:true,max_duration:4,record:false,webhook,metadata:{source:"cpcm_real_call",attempt_id:attemptId,script_profile_id:attempt.script_profile_id,script_version:attempt.script_version,communication_type:attempt.communication_type}};
      const br=await fetch("https://api.bland.ai/v1/calls",{method:"POST",headers:{authorization:apiKey,"Content-Type":"application/json"},body:JSON.stringify(providerPayload)});
      const bd=await br.json().catch(()=>({})),callId=String(bd?.call_id??"").trim();
      if(!br.ok||!callId){
        await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_fail_ai_call_send`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_error:String(bd?.message||`Bland queue failed (${br.status})`),p_response:{status:br.status,message:bd?.message||null}})});
        return json({ok:false,sent:false,error:bd?.message||"Bland did not queue the call"},502);
      }
      const safeResponse={call_id:callId,status:bd?.status??null,message:bd?.message??null};
      const fin=await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_finalize_ai_call_send`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_call_id:callId,p_response:safeResponse})});
      if(!fin.ok){await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_recover_ai_queued_call`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_call_id:callId,p_response:safeResponse})});return json({ok:false,sent:false,error:"Provider queued call but CRM finalization requires recovery",provider_call_id:callId},500);}
      return json({ok:true,sent:true,attempt_id:attemptId,provider_call_id:callId,status:"sent",provider_send_enabled:true});
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

    if (action === "pipeline_test") {
      const requested=String(body.phone_number??"").replace(/\D/g,"");
      if(requested!=="3322590894"&&requested!=="13322590894")return json({error:"Pipeline test destination is not authorized"},403);
      const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!serviceKey)return json({error:"Service configuration unavailable"},503);
      const hr={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
      const qa=await fetch(`${supabaseUrl}/rest/v1/ai_call_qa`,{method:"POST",headers:{...hr,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify({provider:"bland",mode:"pipeline_test",destination_last4:"0894",status:"preparing",completed:false,created_by_email:authEmail})});
      const qrows=await qa.json().catch(()=>[]),q=Array.isArray(qrows)?qrows[0]:null;if(!qa.ok||!q)return json({error:"Could not create pipeline QA record"},500);
      const webhook=`${supabaseUrl}/functions/v1/bland-test-status`;
      const providerPayload={phone_number:allowedTestNumber,task:"This is a private Co Pilot integration pipeline test to an authorized test phone. State clearly that this is a system test. Do not discuss any real debt, consumer, creditor, balance, payment, settlement, or collection activity. Ask the recipient to say a short test phrase, acknowledge it, then end the call.",first_sentence:"Hello, this is the authorized Co Pilot AI pipeline test.",wait_for_greeting:true,max_duration:2,record:false,webhook,metadata:{source:"cpcm_pipeline_test",qa_id:q.id}};
      const br=await fetch("https://api.bland.ai/v1/calls",{method:"POST",headers:{authorization:apiKey,"Content-Type":"application/json"},body:JSON.stringify(providerPayload)});
      const bd=await br.json().catch(()=>({})),callId=String(bd?.call_id??"").trim();
      if(!br.ok||!callId){await fetch(`${supabaseUrl}/rest/v1/ai_call_qa?id=eq.${encodeURIComponent(q.id)}`,{method:"PATCH",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({status:"failed",summary:String(bd?.message||"Pipeline test queue failed").slice(0,4000),updated_at:new Date().toISOString()})});return json({ok:false,error:bd?.message||"Bland did not queue pipeline test"},502)}
      await fetch(`${supabaseUrl}/rest/v1/ai_call_qa?id=eq.${encodeURIComponent(q.id)}`,{method:"PATCH",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({provider_call_id:callId,status:String(bd?.status||"queued"),updated_at:new Date().toISOString()})});
      return json({ok:true,provider:"bland",mode:"pipeline_test",qa_id:q.id,call_id:callId,status:bd?.status??"queued",destination:"***-***-0894"});
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
