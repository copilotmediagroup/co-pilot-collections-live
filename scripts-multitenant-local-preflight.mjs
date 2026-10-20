import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=process.cwd(); let failed=false;
function pass(name,ok,detail=''){console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' — '+detail:''}`);if(!ok)failed=true}
const install='MULTI_TENANT_DEMO_PENDING_INSTALL_26_48.sql', gates='MULTI_TENANT_DEMO_PENDING_GATES_26_48.sql';
for(const bundle of [install,gates]){const text=fs.readFileSync(bundle,'utf8');const files=[...text.matchAll(/^\\i\s+(.+)$/gm)].map(m=>m[1].trim());pass(bundle+' references exist',files.every(f=>fs.existsSync(f)),`${files.length} includes`)}
const app=fs.readFileSync('index.html','utf8');
pass('no hardcoded owner email',!app.includes('afinch2678@gmail.com'));
pass('no browser project fallback',!/(coPilotSupabaseUrl|coPilotSupabasePublishableKey)/.test(app));
pass('join code login present',app.includes('loginJoinCode')&&app.includes('cpcm_join_organization'));
pass('effective role ignores auth user metadata',!app.includes('user?.user_metadata?.requested_role')&&!app.includes('profile?.role||currentUser?.requestedRole'));
pass('join code admin UI present',app.includes('openJoinCodeAdmin')&&app.includes('cpcm_admin_create_join_code'));
const p31=fs.readFileSync('MULTI_TENANT_PHASE31_JOIN_CODE_ONBOARDING.sql','utf8');
pass('pending membership starts inactive',/values\(oid,uid,join_role,false\)/.test(p31));
const p32=fs.readFileSync('MULTI_TENANT_PHASE32_MEMBERSHIP_LIFECYCLE_SYNC.sql','utf8');
pass('activation requires approval',p32.includes('user must be approved before activation'));
const p37=fs.readFileSync('MULTI_TENANT_PHASE37_JOIN_CODE_TABLE_LOCKDOWN.sql','utf8');
pass('join code table browser grants revoked',p37.includes('from public,anon,authenticated'));
const voice=fs.readFileSync('supabase/functions/voice-broadcast/index.ts','utf8');
pass('voice broadcast writes tenant ownership',voice.includes('organization_id: actor.organizationId'));
pass('voice broadcast mutations tenant-scoped',voice.includes('.eq(\"organization_id\", actor.organizationId)'));
const nmi38=fs.readFileSync('MULTI_TENANT_PHASE38_NMI_TENANT_IDEMPOTENCY.sql','utf8');
pass('NMI idempotency tenant-qualified',nmi38.includes('nmi_transactions(organization_id,idempotency_key)'));
try{execFileSync('git',['diff','--check'],{stdio:'pipe'});pass('git diff --check',true)}catch(e){pass('git diff --check',false,String(e.stdout||e.message))}
if(failed)process.exit(1);
