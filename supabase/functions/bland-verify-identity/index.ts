const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const norm=(v:unknown)=>String(v??"").replace(/\D/g,"");
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"POST required"},405);
 const u=Deno.env.get("SUPABASE_URL"),sk=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!u||!sk)return json({error:"Server unavailable"},503);
 let b:any={};try{b=await req.json()}catch{return json({verified:false},200)}
 const attemptId=String(b?.attempt_id??"").trim(),token=String(b?.verification_token??"").trim(),providedLast4=norm(b?.ssn_last4);
 if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!/^[0-9a-f-]{36}$/i.test(token)||!/^[0-9]{4}$/.test(providedLast4))return json({verified:false},200);
 const h={apikey:sk,Authorization:`Bearer ${sk}`};
 const ar=await fetch(`${u}/rest/v1/ai_real_call_attempts?id=eq.${encodeURIComponent(attemptId)}&status=in.(authorized,sending,sent)&select=id,account_id,script_snapshot,preflight_snapshot&limit=1`,{headers:h});
 const as=await ar.json().catch(()=>[]),a=Array.isArray(as)?as[0]:null;if(!ar.ok||!a||String(a?.preflight_snapshot?.identity_verification_token||"")!==token)return json({verified:false},200);
 const policy=a?.script_snapshot?.identity_verification_policy||{};if(policy.required!==true||policy.name_confirmation_alone_sufficient===true)return json({verified:false},200);
 const allowed=Array.isArray(policy.allowed_factors)?policy.allowed_factors:[];if(!allowed.includes("ssn_last4"))return json({verified:false},200);
 const rr=await fetch(`${u}/rest/v1/accounts?id=eq.${encodeURIComponent(a.account_id)}&select=ssn&limit=1`,{headers:h});
 const rows=await rr.json().catch(()=>[]),acct=Array.isArray(rows)?rows[0]:null;if(!rr.ok||!acct)return json({verified:false},200);
 const expected=norm(acct.ssn),verified=expected.length>=4&&providedLast4===expected.slice(-4);
 const rpc=await fetch(`${u}/rest/v1/rpc/cpcm_record_ai_identity_verification`,{method:"POST",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify({p_attempt_id:attemptId,p_verified:verified,p_method:"ssn_last4"})});
 const out=await rpc.json().catch(()=>[]),state=Array.isArray(out)?out[0]:null;
 if(!rpc.ok||!state)return json({verified:false},200);
 return json({verified:state.verified===true,locked:state.locked===true,remaining_attempts:Math.max(0,2-Number(state.failed_attempts||0))});
});
