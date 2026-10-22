import fs from 'node:fs';const s=fs.readFileSync('index.html','utf8');const checks=[
['plan selection prepares server checkout',s.includes("/rpc/cpcm_prepare_subscription_checkout")],
['checkout payload saved without card data',s.includes('window.cpcmPendingSaasCheckout=checkoutRow')],
['easy pay direct next-step copy present',s.includes('Secure Easy Pay Direct/NMI subscription payment is the next gateway step.')],
['no browser subscription amount submitted',!s.includes('p_amount_cents')]
];let bad=0;for(const [n,o] of checks){console.log(o?'PASS':'FAIL',n);if(!o)bad++;}process.exit(bad?1:0);
