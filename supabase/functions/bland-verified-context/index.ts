const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"POST required"},405);
 const u=Deno.env.get("SUPABASE_URL"),sk=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!u||!sk)return json({error:"Server unavailable"},503);
 let b:any={};try{b=await req.json()}catch{return json({authorized:false},200)}
 const attemptId=String(b?.attempt_id??"").trim(),token=String(b?.verification_token??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!/^[0-9a-f-]{36}$/i.test(token))return json({authorized:false},200);
 const h={apikey:sk,Authorization:`Bearer ${sk}`};
 const ar=await fetch(`${u}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&status=in.(authorized,sending,sent)&select=id,account_id,communication_type,script_profile_id,script_version,script_snapshot,payload_snapshot,preflight_snapshot,identity_verified_at,identity_verification_locked_at&limit=1`,{headers:h});
 const rows=await ar.json().catch(()=>[]),a=Array.isArray(rows)?rows[0]:null;
 if(!ar.ok||!a||!a.identity_verified_at||a.identity_verification_locked_at||String(a?.preflight_snapshot?.identity_verification_token||"")!==token)return json({authorized:false},200);
 const sr=await fetch(`${u}/rest/v1/ai_collector_script_profiles?id=eq.${encodeURIComponent(a.script_profile_id)}&approved_for_real_calls=eq.true&select=id,version&limit=1`,{headers:h});
 const ss=await sr.json().catch(()=>[]),current=Array.isArray(ss)?ss[0]:null;
 if(!sr.ok||!current||Number(current.version)!==Number(a.script_version))return json({authorized:false},200);
 const p=a.payload_snapshot||{},s=a.script_snapshot||{};
 return json({authorized:true,communication_type:a.communication_type||null,disclosure:String(s.disclosure||""),first_name:String(p.first_name||""),original_creditor:String(p.original_creditor||""),debt_type:String(p.debt_type||""),current_balance:Number(p.current_balance||0),conversation_policy:s.conversation_policy||{},instructions:{dispute:String(s.dispute_instruction||""),dnc:String(s.dnc_instruction||""),settlement:String(s.settlement_instruction||""),payment:String(s.payment_instruction||""),human_escalation:String(s.human_escalation_instruction||"")}});
});
