import fs from 'node:fs';
import path from 'node:path';

const fail=[]; const pass=(n,ok)=>{console.log(ok?'PASS':'FAIL',n); if(!ok) fail.push(n)};
const tenantTables=['app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items','nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence','ringcentral_call_records','employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts','voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'];
const foundation=fs.readFileSync('MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql','utf8');
const includes=[...foundation.matchAll(/^\\ir\s+(.+)$/gm)].map(m=>m[1].trim());
const sql=includes.map(f=>[f,fs.readFileSync(f,'utf8')]);
let sqlWrites=0, unscopedSql=[];
for(const [file,text] of sql){
  const lines=text.split(/\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    for(const table of tenantTables){
      const insert=new RegExp(`insert\\s+into\\s+(?:public\\.)?${table}\\s*\\(([^)]*)\\)`,'i').exec(line);
      if(insert){ sqlWrites++; if(!/organization_id/i.test(insert[1])) unscopedSql.push(`${file}:${i+1}: insert ${table} missing organization_id`); }
      const update=new RegExp(`update\\s+(?:public\\.)?${table}\\b`,'i').test(line);
      if(update){ sqlWrites++; const window=lines.slice(i,Math.min(lines.length,i+28)).join(' '); const migrationBackfill=/set\s+id\s*=.*where\s+id\s+is\s+null/i.test(window) || /set\s+organization_id\s*=.*where\s+organization_id\s+is\s+null/i.test(window); if(!migrationBackfill && !/organization_id\s*=|organization_id\s+in\b/i.test(window)) unscopedSql.push(`${file}:${i+1}: update ${table} lacks nearby organization_id predicate`); }
    }
  }
}
pass(`foundation SQL tenant writes carry/derive tenant context (${sqlWrites} writes scanned)`,unscopedSql.length===0);
if(unscopedSql.length) console.error(unscopedSql.slice(0,40).join('\n'));

function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(/\.(?:ts|js)$/.test(e.name)) out.push(p)} return out}
const edgeFiles=walk('supabase/functions'); let edgeWrites=0; const unscopedEdge=[];
for(const file of edgeFiles){const text=fs.readFileSync(file,'utf8'); const lines=text.split(/\n/); for(let i=0;i<lines.length;i++){const line=lines[i]; for(const table of tenantTables){const from=new RegExp(`\\.from\\([\\"'\\x60]${table}[\\"'\\x60]\\)`,'i'); if(from.test(line)&&/\.(?:insert|upsert|update)\s*\(/i.test(line)){edgeWrites++; const window=lines.slice(Math.max(0,i-2),Math.min(lines.length,i+12)).join(' '); const insertish=/\.(?:insert|upsert)\s*\(/i.test(line); const updateish=/\.update\s*\(/i.test(line); const hasOrg=/organization_id|organizationId|organization_id/i.test(window); const scopedUpdate=/\.eq\([\"']organization_id[\"']/i.test(window); if(!hasOrg || (updateish&&!scopedUpdate)) unscopedEdge.push(`${file}:${i+1}: ${table} write lacks explicit tenant ${updateish?'predicate':'context'}`); }}}}
pass(`Edge Function tenant writes are explicitly tenant-bound (${edgeWrites} writes scanned)`,unscopedEdge.length===0);
if(unscopedEdge.length) console.error(unscopedEdge.slice(0,40).join('\n'));

const phase8=fs.readFileSync('PRODUCTION_PHASE8_CUTOVER_INSTALL.sql','utf8');
pass('Phase 8 explicitly depends on production writer audit',/all production writers explicitly carry\/derive tenant context/i.test(phase8));
pass('writer gate scans only canonical production foundation SQL',includes.length===48 && !includes.some(x=>/DEMO|STAGING|PHASE8/i.test(x)));
if(fail.length) process.exit(1);
console.log('PASS production writer tenant-context gate — production foundation and Edge Function writes are tenant-bound before legacy defaults may be removed');
