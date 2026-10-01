const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const allowed=new Set(["dispute","stop_calling","callback_request","payment_plan_interest","settlement_request","already_paid","cannot_pay","human_requested","wrong_number","conversation_note"]);
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({accepted:false},405);
 const u=Deno.env.get("SUPABASE_URL"),sk=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!u||!sk)return json({accepted:false},503);
 let b:any={};try{b=await req.json()}catch{return json({accepted:false},200)}
 const attemptId=String(b?.attempt_id??"").trim(),token=String(b?.verification_token??"").trim(),eventType=String(b?.event_type??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!/^[0-9a-f-]{36}$/i.test(token)||!allowed.has(eventType))return json({accepted:false},200);
 const h={apikey:sk,Authorization:`Bearer ${sk}`,"Content-Type":"application/json"};
 const ar=await fetch(`${u}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&status=in.(authorized,sending,sent)&select=id,account_id,preflight_snapshot,identity_verified_at,identity_verification_locked_at&limit=1`,{headers:h});
 const rows=await ar.json().catch(()=>[]),a=Array.isArray(rows)?rows[0]:null;
 if(!ar.ok||!a||!a.identity_verified_at||a.identity_verification_locked_at||String(a?.preflight_snapshot?.identity_verification_token||"")!==token)return json({accepted:false},200);
 const raw=b?.event_payload&&typeof b.event_payload==="object"?b.event_payload:{};
 const payload:any={};
 if(eventType==="callback_request"&&raw.preferred_time)payload.preferred_time=String(raw.preferred_time).slice(0,200);
 if(eventType==="settlement_request"&&raw.requested_amount!=null){const n=Number(raw.requested_amount);if(Number.isFinite(n)&&n>=0)payload.requested_amount=n}
 if(eventType==="payment_plan_interest"&&raw.proposed_amount!=null){const n=Number(raw.proposed_amount);if(Number.isFinite(n)&&n>=0)payload.proposed_amount=n}
 if(raw.note)payload.note=String(raw.note).slice(0,1000);
 const ir=await fetch(`${u}/rest/v1/ai_conversation_events`,{method:"POST",headers:{...h,Prefer:"return=representation"},body:JSON.stringify({attempt_id:attemptId,account_id:a.account_id,event_type:eventType,event_payload:payload,requires_human_review:true})});
 const out=await ir.json().catch(()=>[]);if(!ir.ok)return json({accepted:false},500);
 return json({accepted:true,event_id:Array.isArray(out)?out[0]?.id:null,requires_human_review:true});
});
