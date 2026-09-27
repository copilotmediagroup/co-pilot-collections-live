const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","content-type":"application/json"};
Deno.serve((req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:C});
 return new Response(JSON.stringify({ok:false,disabled:true,reason:"Historical RingCentral synchronization is disabled; inbound calls use webhook delivery."}),{status:503,headers:C});
});
