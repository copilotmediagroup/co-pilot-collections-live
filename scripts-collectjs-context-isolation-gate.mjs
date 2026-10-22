import fs from 'node:fs';
const s=fs.readFileSync('index.html','utf8');
const checks=[
 ['SaaS request reconfigures Collect.js immediately before tokenization',/function prepareSaasCollectRequest\(\)\{configureSaasCollect\(\);[\s\S]*CollectJS\.startPaymentRequest\(\)/],
 ['SaaS activation uses context-safe request helper',/btn\.onclick=function\(\)\{[\s\S]*prepareSaasCollectRequest\(\)/],
 ['debtor payment forces debtor Collect.js configuration before tokenization',/window\.startNmiPayment=async function\(\)[\s\S]*await loadCollect\(true\);[\s\S]*CollectJS\.startPaymentRequest\(\)/],
 ['debtor Collect callback remains explicit',/callback:window\.cpcmNmiCollectCallback/],
 ['SaaS Collect callback remains explicit',/callback:'cpcmSaasCollectCallback'/]
];
let bad=0;for(const [name,re] of checks){const ok=re.test(s);console.log(ok?'PASS':'FAIL',name);if(!ok)bad++}if(bad)process.exit(1);
