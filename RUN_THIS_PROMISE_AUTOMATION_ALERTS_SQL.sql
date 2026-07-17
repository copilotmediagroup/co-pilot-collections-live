-- Co Pilot Collections Manager - Promise Automation + Collector Alerts
-- Run this in the matching Supabase project before using the Alerts dashboard.

create extension if not exists pgcrypto;

create table if not exists public.collector_alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  alert_type text not null default 'General',
  severity text not null default 'info',
  title text not null,
  message text,
  due_date date,
  status text not null default 'Open',
  assigned_to_email text,
  created_by_email text,
  source_table text,
  source_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_email text
);

alter table public.collector_alerts
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists alert_type text not null default 'General',
  add column if not exists severity text not null default 'info',
  add column if not exists title text not null default 'Collector Alert',
  add column if not exists message text,
  add column if not exists due_date date,
  add column if not exists status text not null default 'Open',
  add column if not exists assigned_to_email text,
  add column if not exists created_by_email text,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by_email text;

create index if not exists idx_collector_alerts_account_id on public.collector_alerts(account_id);
create index if not exists idx_collector_alerts_status_due on public.collector_alerts(status, due_date);
create index if not exists idx_collector_alerts_assigned on public.collector_alerts(lower(coalesce(assigned_to_email,'')));
create unique index if not exists idx_collector_alerts_unique_open_source on public.collector_alerts(alert_type, source_table, source_id) where status = 'Open' and source_id is not null and source_id <> '';

alter table public.collector_alerts enable row level security;

drop policy if exists collector_alerts_select on public.collector_alerts;
drop policy if exists collector_alerts_insert on public.collector_alerts;
drop policy if exists collector_alerts_update on public.collector_alerts;
drop policy if exists collector_alerts_delete on public.collector_alerts;

create policy collector_alerts_select on public.collector_alerts for select to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or exists (select 1 from public.accounts a where a.id = account_id and lower(coalesce(a.assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
);
create policy collector_alerts_insert on public.collector_alerts for insert to authenticated with check (auth.role() = 'authenticated');
create policy collector_alerts_update on public.collector_alerts for update to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
) with check (auth.role() = 'authenticated');
create policy collector_alerts_delete on public.collector_alerts for delete to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
);

notify pgrst, 'reload schema';
