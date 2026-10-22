import fs from 'node:fs';
const s=fs.readFileSync('index.html','utf8');let bad=0;const c=(n,r)=>{const ok=r.test(s);console.log(ok?'PASS':'FAIL',n);if(!ok)bad++};
c('cancel resets activation button',/btn\.textContent='Continue to Secure Payment';btn\.onclick=continueSaasCheckout/);
c('cancel clears hosted card inputs',/function cancelSaasCheckout\(\).*CollectJS\.clearInputs/);
c('success clears hosted card inputs',/Subscription activated successfully[\s\S]{0,500}CollectJS\.clearInputs/);
c('success invalidates SaaS collect ready state',/Subscription activated successfully[\s\S]{0,400}cpcmSaasCollectReady=false/);
c('SaaS token remains single use handoff only',/JSON\.stringify\(\{checkoutId,paymentToken\}\)/);
process.exit(bad?1:0);
