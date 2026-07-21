-- Co Pilot Collections LIVE — R8N19.5 Live Transfer Screen Pop
create table if not exists public.voice_broadcast_live_transfers (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.voice_broadcast_calls(id) on delete cascade,
  campaign_id uuid references public.voice_broadcast_campaigns(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  phone_number text,
  status text not null default 'waiting' check (status in ('waiting','claimed','connected','expired','canceled')),
  claimed_by_email text,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(call_id)
);
create index if not exists voice_broadcast_live_transfers_status_idx on public.voice_broadcast_live_transfers(status, created_at desc);
create index if not exists voice_broadcast_live_transfers_account_idx on public.voice_broadcast_live_transfers(account_id);
alter table public.voice_broadcast_live_transfers enable row level security;
drop policy if exists "authenticated staff read live transfers" on public.voice_broadcast_live_transfers;
create policy "authenticated staff read live transfers" on public.voice_broadcast_live_transfers for select to authenticated using (true);
drop policy if exists "authenticated staff claim live transfers" on public.voice_broadcast_live_transfers;
create policy "authenticated staff claim live transfers" on public.voice_broadcast_live_transfers for update to authenticated using (status = 'waiting' or lower(coalesce(claimed_by_email,'')) = lower(coalesce(auth.jwt()->>'email',''))) with check (true);
grant select, update on public.voice_broadcast_live_transfers to authenticated;
