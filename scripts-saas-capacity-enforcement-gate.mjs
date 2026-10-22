import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE69_SAAS_CAPACITY_ENFORCEMENT.sql','utf8');
const checks=[
 ['account capacity function',/function private\.enforce_saas_account_capacity\(\)/i],
 ['user capacity function',/function private\.enforce_saas_user_capacity\(\)/i],
 ['account limit canonical catalog',/p\.included_accounts/i],
 ['user limit canonical catalog',/p\.included_users/i],
 ['account usage tenant scoped',/from public\.accounts a where a\.organization_id=new\.organization_id/i],
 ['user usage tenant scoped',/organization_members m where m\.organization_id=new\.organization_id and m\.is_active=true/i],
 ['account insert trigger',/before insert on public\.accounts/i],
 ['member activation trigger',/before insert or update of organization_id,is_active on public\.organization_members/i],
 ['demo exempt',/coalesce\(demo,false\) or lim is null then return new/i],
 ['account overage rejected',/SaaS account capacity reached/i],
 ['user overage rejected',/SaaS user capacity reached/i],
 ['functions not browser executable',/revoke all on function private\.enforce_saas_account_capacity\(\) from public,anon,authenticated/i]
];let bad=0;for(const [n,r] of checks){let ok=r.test(sql);console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
