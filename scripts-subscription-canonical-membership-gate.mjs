import fs from 'node:fs';
const f=fs.readFileSync('MULTI_TENANT_PHASE87_CANONICAL_SUBSCRIPTION_MEMBERSHIP.sql','utf8');
const tests=[
['management replaced',/function public\.cpcm_subscription_management\(\)/],
['cancellation replaced',/function public\.cpcm_request_subscription_cancellation\(\)/],
['resume replaced',/function public\.cpcm_resume_subscription_renewal\(\)/],
['plan safety replaced',/function public\.cpcm_request_subscription_plan_change\(p_plan_code text,p_billing_interval text\)/],
['pending reader replaced',/function public\.cpcm_my_pending_subscription_plan_change\(\)/],
['pending cancel replaced',/function public\.cpcm_cancel_subscription_plan_change_request\(p_request_id uuid\)/],
['canonical auth user membership',/m\.auth_user_id=auth\.uid\(\)/],
['canonical active membership',/m\.is_active=true/],
['active usage canonical',/m2\.is_active=true/],
['no legacy membership user id',!/m\.user_id=auth\.uid\(\)/.test(f)],
['no legacy membership status active',!/m(?:2)?\.status='active'/.test(f)],
['admin required',/Agency Admin required/],
['demo protected',/Demo organizations do not have production subscriptions/],
['authenticated grants retained',/grant execute on function public\.cpcm_request_subscription_plan_change\(text,text\) to authenticated/]
];
let bad=false;for(const [n,t] of tests){const ok=t instanceof RegExp?t.test(f):t;console.log(ok?'PASS':'FAIL',n);if(!ok)bad=true}if(bad)process.exit(1);
