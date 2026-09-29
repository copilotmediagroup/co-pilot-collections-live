const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),blandKey=Deno.env.get("BLAND_API_KEY");
 if(!supabaseUrl||!serviceKey||!blandKey)return json({error:"Server configuration unavailable"},503);
 let body:any={};try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const callId=String(body?.call_id??body?.callId??body?.id??"").trim();
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(callId))return json({error:"Valid call_id required"},400);
 const hr={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
 const mr=await fetch(`${supabaseUrl}/rest/v1/ai_real_call_attempts?provider_call_id=eq.${encodeURIComponent(callId)}&select=id,status&limit=1`,{headers:hr});
 const matches=await mr.json().catch(()=>[]);if(!mr.ok||!Array.isArray(matches)||!matches[0])return json({error:"Unknown provider call"},404);
 const br=await fetch("https://api.bland.ai/v1/calls/"+encodeURIComponent(callId),{headers:{authorization:blandKey}});
 const data=await br.json().catch(()=>({}));if(!br.ok)return json({error:"Provider verification failed"},502);
 const safe={call_id:callId,status:data?.status??null,completed:data?.completed===true,answered_by:data?.answered_by??null,call_length:data?.call_length??null,summary:String(data?.summary??"").slice(0,4000),concatenated_transcript:String(data?.concatenated_transcript??"").slice(0,12000),price:data?.price??null,disposition_tag:data?.disposition_tag??null,message:data?.message??null};
 const rpc=await fetch(`${supabaseUrl}/rest/v1/rpc/cpcm_apply_ai_provider_result`,{method:"POST",headers:{...hr,"Content-Type":"application/json"},body:JSON.stringify({p_call_id:callId,p_status:String(data?.status??""),p_completed:data?.completed===true,p_response:safe})});
 if(!rpc.ok)return json({error:"CRM status update failed"},500);
 return json({ok:true,verified:true,call_id:callId,completed:data?.completed===true});
});
