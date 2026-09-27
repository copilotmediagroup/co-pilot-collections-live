// RingCentral inbound telephony webhook -> existing call record store.
import { createClient } from "npm:@supabase/supabase-js@2";
const H={"content-type":"application/json"};
const ok=(token?:string|null)=>new Response("",{status:200,headers:{...H,...(token?{"Validation-Token":token}:{})}});
function serviceKey(){const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(k)return k;const r=Deno.env.get("SUPABASE_SECRET_KEYS")||"";try{const p=JSON.parse(r);return p.default||Object.values(p)[0]||""}catch{return r}}
Deno.serve(async(req)=>{
 const validation=req.headers.get("Validation-Token");
 if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers:H});
 const raw=await req.text();
 // RingCentral validates subscriptions with an empty POST. Echo the exact
 // request token; do not depend on Content-Length being present.
 if(validation&&!raw.trim())return ok(validation);
 // RingCentral uses Validation-Token for subscription validation, but normal\n // telephony event deliveries are authenticated by the unguessable webhook URL/subscription.\n // Do not require the validation header on event POSTs; RingCentral does not send it reliably.
 try{
  const payload=JSON.parse(raw),body=payload?.body||{},parties=Array.isArray(body.parties)?body.parties:[];
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey(),{auth:{persistSession:false}});
  const inbound=parties.filter((p:any)=>p?.direction==="Inbound"&&["Setup","Proceeding","Answered"].includes(String(p?.status?.code||"")));
  for(const party of inbound){
   const extId=String(party.extensionId||party.to?.extensionId||""); if(!extId)continue;
   const {data:m}=await admin.from("ringcentral_user_mappings").select("employee_email").eq("ringcentral_extension_id",extId).eq("enabled",true).maybeSingle();
   const caller=party.from?.phoneNumber||""; if(!m?.employee_email||!caller)continue;
   const session=String(body.telephonySessionId||body.sessionId||payload.uuid||""); if(!session)continue;
   const row={rc_call_id:"inbound:"+session+":"+extId,session_id:session,extension_id:extId,employee_email:String(m.employee_email).toLowerCase(),employee_name:party.to?.name||null,direction:"Inbound",action:"Phone Call",result:party.status?.code||"Ringing",from_number:caller,to_number:party.to?.phoneNumber||null,start_time:body.eventTime||payload.timestamp||new Date().toISOString(),duration_seconds:0,telephony_status:party.status?.code||"Ringing",raw:payload,synced_at:new Date().toISOString()};
   const {error}=await admin.from("ringcentral_call_records").upsert(row,{onConflict:"rc_call_id"}); if(error)throw error;
  }
  return ok();
 }catch(e){console.error("RingCentral inbound webhook failed",e);return new Response("Webhook error",{status:500,headers:H})}
});