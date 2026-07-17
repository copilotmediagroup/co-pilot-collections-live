-- Co Pilot Collections Manager - Compliance Guard / Call Rules
-- Run this in the matching Supabase project before using the Compliance Guard save button.

alter table public.accounts add column if not exists do_not_call boolean default false;
alter table public.accounts add column if not exists cease_and_desist boolean default false;
alter table public.accounts add column if not exists disputed_flag boolean default false;
alter table public.accounts add column if not exists bankruptcy_flag boolean default false;
alter table public.accounts add column if not exists deceased_flag boolean default false;
alter table public.accounts add column if not exists attorney_represented boolean default false;
alter table public.accounts add column if not exists wrong_number_flag boolean default false;
alter table public.accounts add column if not exists needs_manager_review boolean default false;
alter table public.accounts add column if not exists consent_confirmed boolean default false;
alter table public.accounts add column if not exists compliance_call_start time default '08:00';
alter table public.accounts add column if not exists compliance_call_end time default '21:00';
alter table public.accounts add column if not exists max_calls_per_day integer default 2;
alter table public.accounts add column if not exists compliance_time_zone text;
alter table public.accounts add column if not exists consent_date date;
alter table public.accounts add column if not exists attorney_name text;
alter table public.accounts add column if not exists restriction_source text;
alter table public.accounts add column if not exists compliance_notes text;
alter table public.accounts add column if not exists compliance_updated_by_email text;
alter table public.accounts add column if not exists compliance_updated_at timestamptz;

create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid,
  event_type text not null,
  phone_number text,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_events_account_id on public.compliance_events(account_id);
create index if not exists idx_compliance_events_created_at on public.compliance_events(created_at desc);
create index if not exists idx_accounts_compliance_flags on public.accounts(do_not_call, cease_and_desist, disputed_flag, bankruptcy_flag, deceased_flag, attorney_represented, wrong_number_flag);

alter table public.compliance_events enable row level security;

drop policy if exists "compliance_events_select_authenticated" on public.compliance_events;
drop policy if exists "compliance_events_insert_authenticated" on public.compliance_events;
drop policy if exists "compliance_events_update_authenticated" on public.compliance_events;
drop policy if exists "compliance_events_delete_authenticated" on public.compliance_events;

create policy "compliance_events_select_authenticated" on public.compliance_events
  for select to authenticated using (true);
create policy "compliance_events_insert_authenticated" on public.compliance_events
  for insert to authenticated with check (true);
create policy "compliance_events_update_authenticated" on public.compliance_events
  for update to authenticated using (true) with check (true);
create policy "compliance_events_delete_authenticated" on public.compliance_events
  for delete to authenticated using (true);

-- PHONE-FIRST SEARCH SUPPORT INDEXES
-- Included here to keep the upload package compact while preserving prior phone search support.
create index if not exists idx_accounts_phone1 on public.accounts(phone1);
create index if not exists idx_accounts_phone2 on public.accounts(phone2);
create index if not exists idx_accounts_phone3 on public.accounts(phone3);
create index if not exists idx_accounts_phone4 on public.accounts(phone4);
create index if not exists idx_accounts_phone5 on public.accounts(phone5);
create index if not exists idx_accounts_ssn on public.accounts(ssn);
create index if not exists idx_accounts_account_number on public.accounts(account_number);
create index if not exists idx_accounts_full_name on public.accounts(full_name);
