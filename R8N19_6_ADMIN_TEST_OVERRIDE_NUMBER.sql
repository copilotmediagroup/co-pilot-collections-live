-- Co Pilot Collections LIVE — R8N19.6
-- Admin-only test override number for account-linked broadcast testing.

alter table public.accounts
  add column if not exists test_phone_override text;

comment on column public.accounts.test_phone_override is
  'Optional admin testing number. Voice broadcasts use this number before phone1-phone10 while retaining the original account_id for live-transfer screen pop testing.';
