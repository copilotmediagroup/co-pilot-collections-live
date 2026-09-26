create table if not exists public.ringcentral_call_records (
  rc_call_id text primary key,
  session_id text,
  extension_id text,
  employee_email text,
  employee_name text,
  direction text,
  action text,
  result text,
  from_number text,
  to_number text,
  start_time timestamptz not null,
  duration_seconds integer not null default 0,
  telephony_status text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists ringcentral_call_records_start_idx on public.ringcentral_call_records(start_time desc);
create index if not exists ringcentral_call_records_employee_start_idx on public.ringcentral_call_records(lower(employee_email),start_time desc);
alter table public.ringcentral_call_records enable row level security;
revoke all on public.ringcentral_call_records from public, anon;
grant select on public.ringcentral_call_records to authenticated;
drop policy if exists ringcentral_calls_admin_select on public.ringcentral_call_records;
create policy ringcentral_calls_admin_select on public.ringcentral_call_records for select to authenticated using (
 lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
 or exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(u.role,''))='admin' and coalesce(u.is_active,true)=true)
);
