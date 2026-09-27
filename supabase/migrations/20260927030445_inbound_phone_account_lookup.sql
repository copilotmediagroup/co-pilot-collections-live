create or replace function public.cpcm_accounts_by_phone(p_phone text)
returns table(id uuid, full_name text, account_number text, current_balance numeric, original_creditor text, portfolio text, status text)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id,a.full_name,a.account_number,a.current_balance,a.original_creditor,a.portfolio,a.status
  from public.accounts a
  where length(regexp_replace(coalesce(p_phone,''),'\D','','g')) >= 10
    and right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10) in (
      right(regexp_replace(coalesce(a.phone1,''),'\D','','g'),10), right(regexp_replace(coalesce(a.phone2,''),'\D','','g'),10),
      right(regexp_replace(coalesce(a.phone3,''),'\D','','g'),10), right(regexp_replace(coalesce(a.phone4,''),'\D','','g'),10),
      right(regexp_replace(coalesce(a.phone5,''),'\D','','g'),10), right(regexp_replace(coalesce(a.phone6,''),'\D','','g'),10),
      right(regexp_replace(coalesce(a.phone7,''),'\D','','g'),10), right(regexp_replace(coalesce(a.phone8,''),'\D','','g'),10),
      right(regexp_replace(coalesce(a.phone9,''),'\D','','g'),10), right(regexp_replace(coalesce(a.phone10,''),'\D','','g'),10)
    )
  limit 20;
$$;
revoke all on function public.cpcm_accounts_by_phone(text) from public, anon;
grant execute on function public.cpcm_accounts_by_phone(text) to authenticated;