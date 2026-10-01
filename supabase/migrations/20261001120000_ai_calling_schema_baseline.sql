-- Reconstructed from inspected LIVE definitions. Repo baseline only.
create table if not exists public.ai_call_qa (
 id uuid primary key default gen_random_uuid(), account_id uuid references public.accounts(id) on delete set null,
 provider text not null default 'bland', provider_call_id text unique, mode text not null default 'collector_sandbox',
 destination_last4 text, observed_caller_id text, status text, completed boolean not null default false,
 answered_by text, duration_minutes numeric, price numeric, summary text, transcript text, created_by_email text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 suggested_dispositions jsonb not null default '[]'::jsonb, classification_reviewed boolean not null default false,
 classification_reviewed_at timestamptz
);
create table if not exists public.ai_collector_script_profiles (
 id uuid primary key default gen_random_uuid(), profile_name text not null unique,
 identity_prompt text not null default '', initial_disclosure text not null default '', subsequent_disclosure text not null default '',
 dispute_instruction text not null default '', dnc_instruction text not null default '', settlement_instruction text not null default '',
 payment_instruction text not null default '', human_escalation_instruction text not null default '',
 approved_for_real_calls boolean not null default false, approved_by_email text, approved_at timestamptz,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 conversation_policy jsonb not null default '{}'::jsonb, identity_verification_policy jsonb not null default '{}'::jsonb
);
create table if not exists public.account_communication_compliance (
 account_id uuid primary key references public.accounts(id) on delete cascade, first_debt_communication_at timestamptz,
 validation_notice_sent_at timestamptz, validation_notice_method text, validation_notice_source text, recorded_by_email text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_call_runtime_config (
 id boolean primary key default true check (id=true), real_provider_send_enabled boolean not null default false,
 enabled_by_email text, enabled_at timestamptz, updated_at timestamptz not null default now()
);
insert into public.ai_call_runtime_config(id,real_provider_send_enabled) values(true,false) on conflict(id) do nothing;
create table if not exists public.ai_real_call_attempts (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id) on delete restrict,
 requested_phone_last4 text not null, phone_slot integer, communication_type text,
 script_profile_id uuid references public.ai_collector_script_profiles(id) on delete restrict, script_profile_name text, script_version integer,
 script_snapshot jsonb not null default '{}'::jsonb, payload_snapshot jsonb not null default '{}'::jsonb,
 preflight_snapshot jsonb not null default '{}'::jsonb, status text not null default 'prepared',
 provider text not null default 'bland', provider_call_id text, created_by_email text not null, authorized_at timestamptz,
 sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 send_started_at timestamptz, send_error text, provider_response_snapshot jsonb not null default '{}'::jsonb,
 constraint ai_real_call_attempts_status_chk check(status in ('prepared','authorized','sending','send_unknown','sent','blocked','cancelled','failed'))
);
create index if not exists ai_call_qa_account_id_idx on public.ai_call_qa(account_id);
create index if not exists ai_call_qa_created_at_idx on public.ai_call_qa(created_at desc);
create index if not exists account_comm_validation_sent_idx on public.account_communication_compliance(validation_notice_sent_at);
create index if not exists ai_real_attempt_account_idx on public.ai_real_call_attempts(account_id,created_at desc);
create index if not exists ai_real_attempt_status_idx on public.ai_real_call_attempts(status,created_at desc);
create unique index if not exists ai_real_call_provider_call_id_unique on public.ai_real_call_attempts(provider_call_id) where provider_call_id is not null;

alter table public.ai_call_qa enable row level security;
alter table public.ai_collector_script_profiles enable row level security;
alter table public.account_communication_compliance enable row level security;
alter table public.ai_call_runtime_config enable row level security;
alter table public.ai_real_call_attempts enable row level security;

drop policy if exists ai_call_qa_admin_insert on public.ai_call_qa;
create policy ai_call_qa_admin_insert on public.ai_call_qa for insert to authenticated with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_call_qa_admin_select on public.ai_call_qa;
create policy ai_call_qa_admin_select on public.ai_call_qa for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_call_qa_admin_update on public.ai_call_qa;
create policy ai_call_qa_admin_update on public.ai_call_qa for update to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_script_admin_select on public.ai_collector_script_profiles;
create policy ai_script_admin_select on public.ai_collector_script_profiles for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_script_admin_write on public.ai_collector_script_profiles;
create policy ai_script_admin_write on public.ai_collector_script_profiles for all to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists account_comm_compliance_admin_select on public.account_communication_compliance;
create policy account_comm_compliance_admin_select on public.account_communication_compliance for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists account_comm_compliance_admin_write on public.account_communication_compliance;
create policy account_comm_compliance_admin_write on public.account_communication_compliance for all to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_runtime_admin_select on public.ai_call_runtime_config;
create policy ai_runtime_admin_select on public.ai_call_runtime_config for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_real_attempt_admin_select on public.ai_real_call_attempts;
create policy ai_real_attempt_admin_select on public.ai_real_call_attempts for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
