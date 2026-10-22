-- Phase 69: enforce paid SaaS capacity at the database boundary.
-- Limits come only from the canonical plan catalog. Demo tenants are intentionally exempt.
begin;

create or replace function private.enforce_saas_account_capacity()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  lim integer;
  used_count bigint;
  demo boolean;
begin
  if new.organization_id is null then return new; end if;
  select coalesce(o.is_demo,false),p.included_accounts
    into demo,lim
  from public.organizations o
  left join public.saas_plan_catalog p on p.plan_code=o.plan and p.is_active=true
  where o.id=new.organization_id;
  if coalesce(demo,false) or lim is null then return new; end if;
  select count(*) into used_count from public.accounts a where a.organization_id=new.organization_id;
  if used_count >= lim then
    raise exception 'SaaS account capacity reached (% accounts). Upgrade the agency plan before adding more accounts.',lim using errcode='P0001';
  end if;
  return new;
end
$$;

create or replace function private.enforce_saas_user_capacity()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  lim integer;
  used_count bigint;
  demo boolean;
begin
  if new.organization_id is null or coalesce(new.is_active,true)=false then return new; end if;
  -- An update that does not newly consume a seat is harmless.
  if tg_op='UPDATE' and old.organization_id=new.organization_id and coalesce(old.is_active,true)=true then return new; end if;
  select coalesce(o.is_demo,false),p.included_users
    into demo,lim
  from public.organizations o
  left join public.saas_plan_catalog p on p.plan_code=o.plan and p.is_active=true
  where o.id=new.organization_id;
  if coalesce(demo,false) or lim is null then return new; end if;
  select count(*) into used_count from public.organization_members m where m.organization_id=new.organization_id and m.is_active=true;
  if used_count >= lim then
    raise exception 'SaaS user capacity reached (% users). Upgrade the agency plan before activating another user.',lim using errcode='P0001';
  end if;
  return new;
end
$$;

drop trigger if exists trg_enforce_saas_account_capacity on public.accounts;
create trigger trg_enforce_saas_account_capacity before insert on public.accounts
for each row execute function private.enforce_saas_account_capacity();

drop trigger if exists trg_enforce_saas_user_capacity on public.organization_members;
create trigger trg_enforce_saas_user_capacity before insert or update of organization_id,is_active on public.organization_members
for each row execute function private.enforce_saas_user_capacity();

revoke all on function private.enforce_saas_account_capacity() from public,anon,authenticated;
revoke all on function private.enforce_saas_user_capacity() from public,anon,authenticated;
commit;
