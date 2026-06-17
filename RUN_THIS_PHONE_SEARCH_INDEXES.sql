

-- PHONE-FIRST SEARCH SUPPORT INDEXES
-- Optional helper indexes for future server-side search.
create index if not exists idx_accounts_phone1 on public.accounts(phone1);
create index if not exists idx_accounts_phone2 on public.accounts(phone2);
create index if not exists idx_accounts_phone3 on public.accounts(phone3);
create index if not exists idx_accounts_phone4 on public.accounts(phone4);
create index if not exists idx_accounts_phone5 on public.accounts(phone5);
create index if not exists idx_accounts_ssn on public.accounts(ssn);
create index if not exists idx_accounts_account_number on public.accounts(account_number);
create index if not exists idx_accounts_full_name on public.accounts(full_name);
