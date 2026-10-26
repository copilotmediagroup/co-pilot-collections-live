import fs from 'node:fs';
const f='PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql';
const s=fs.readFileSync(f,'utf8').toLowerCase();
const fail=[];
if(!s.includes('begin read only;')) fail.push('must begin READ ONLY');
if(!s.includes('rollback;')) fail.push('must end with rollback');
for(const x of ['insert into','update public.','delete from','alter table','create table','drop table','create policy','drop policy']) if(s.includes(x)) fail.push(`mutation token forbidden: ${x}`);
for(const x of ['app_users','accounts','payment_plans','payments_ledger','client_remittance_batches','nmi_transactions']) if(!s.includes(`'${x}'`)) fail.push(`missing prerequisite check: ${x}`);
if(!s.includes("to_regclass('public.organizations')")||!s.includes("to_regclass('public.organization_members')")) fail.push('partial-foundation checks missing');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation pre-mutation gate — compatibility SQL is read-only and fail-closed');
