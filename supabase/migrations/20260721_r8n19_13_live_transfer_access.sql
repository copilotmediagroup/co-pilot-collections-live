-- R8N19.13: allow authenticated collectors to see and claim active screen-pop rows.
-- The service-role webhook creates these rows; logged-in app users only read/update them.

alter table if exists public.voice_broadcast_live_transfers enable row level security;

grant select, update on table public.voice_broadcast_live_transfers to authenticated;

drop policy if exists "authenticated users can view live transfers" on public.voice_broadcast_live_transfers;
create policy "authenticated users can view live transfers"
on public.voice_broadcast_live_transfers
for select
to authenticated
using (expires_at > now() and status in ('waiting','connected','claimed'));

drop policy if exists "authenticated users can claim live transfers" on public.voice_broadcast_live_transfers;
create policy "authenticated users can claim live transfers"
on public.voice_broadcast_live_transfers
for update
to authenticated
using (expires_at > now() and status in ('waiting','connected'))
with check (status in ('waiting','connected','claimed'));

create index if not exists voice_broadcast_live_transfers_active_idx
on public.voice_broadcast_live_transfers (status, expires_at, created_at);
