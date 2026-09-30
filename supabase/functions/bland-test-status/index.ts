const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"POST required"},405);
 const u=Deno.env.get("SUPABASE_URL"),sk=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),bk=Deno.env.get("BLAND_API_KEY");if(!u||!sk||!bk)return json({error:"Server configuration unavailable"},503);
 let b:any={};try{b=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const id=String(b?.call_id??b?.callId??b?.id??"").trim();if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id))return json({error:"Valid call_id required"},400);
 const h={apikey:sk,Authorization:`Bearer ${sk}`};
 const qr=await fetch(`${u}/rest/v1/ai_call_qa?provider_call_id=eq.${encodeURIComponent(id)}&mode=eq.pipeline_test&select=id&limit=1`,{headers:h});const qs=await qr.json().catch(()=>[]),q=Array.isArray(qs)?qs[0]:null;if(!qr.ok||!q)return json({error:"Unknown pipeline test call"},404);
 const br=await fetch("https://api.bland.ai/v1/calls/"+encodeURIComponent(id),{headers:{authorization:bk}});const d=await br.json().catch(()=>({}));if(!br.ok)return json({error:"Provider verification failed"},502);
 const patch={status:String(d?.status??""),completed:d?.completed===true,answered_by:d?.answered_by??null,duration_minutes:d?.call_length??null,price:d?.price??null,summary:String(d?.summary??"").slice(0,4000),transcript:String(d?.concatenated_transcript??"").slice(0,12000),updated_at:new Date().toISOString()};
 const pr=await fetch(`${u}/rest/v1/ai_call_qa?id=eq.${encodeURIComponent(q.id)}`,{method:"PATCH",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify(patch)});if(!pr.ok)return json({error:"QA update failed"},500);
 return json({ok:true,verified:true,call_id:id,completed:patch.completed});
});
