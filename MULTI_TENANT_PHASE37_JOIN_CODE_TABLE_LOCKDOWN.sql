-- Phase 37: join-code secrets are RPC-only; no browser role may enumerate the backing table directly.
begin;
revoke all on table public.organization_join_codes from public,anon,authenticated;
commit;
