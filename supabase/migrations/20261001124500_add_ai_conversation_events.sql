create table if not exists public.ai_conversation_events(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.ai_real_call_attempts(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete restrict,
 event_type text not null check(event_type in ('dispute','stop_calling','callback_request','payment_plan_interest','settlement_request','already_paid','cannot_pay','human_requested','wrong_number','conversation_note')),
 event_payload jsonb not null default '{}'::jsonb,
 requires_human_review boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.ai_conversation_events enable row level security;
drop policy if exists ai_conversation_events_admin_select on public.ai_conversation_events;
create policy ai_conversation_events_admin_select on public.ai_conversation_events for select to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
create index if not exists ai_conversation_events_attempt_idx on public.ai_conversation_events(attempt_id,created_at desc);
