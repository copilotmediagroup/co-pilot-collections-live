-- Phase 58: self-service production agency registration, still locked behind Phase 57 subscription activation.
-- The authenticated owner may create exactly one pending-payment organization for themselves.
begin;

alter table public.organizations add column if not exists owner_name text;
alter table public.organizations add column if not exists owner_phone text;
alter table public.organizations add column if not exists signup_email text;

create or replace function public.cpcm_request_agency_signup(
  p_name text,
  p_slug text,
  p_admin_name text default null,
  p_phone text default null
) returns table(organization_id uuid,status text)
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  oid uuid := gen_random_uuid();
  clean_name text := nullif(btrim(p_name),'');
  clean_slug text := lower(nullif(btrim(p_slug),''));
  actor_email text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if clean_name is null then raise exception 'Organization name required'; end if;
  if clean_slug is null or clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organization slug'; end if;
  if exists(select 1 from public.organization_members m where m.auth_user_id=uid) then raise exception 'This login already belongs to an organization'; end if;
  if exists(select 1 from public.organizations o where o.slug=clean_slug) then raise exception 'Organization name is already in use'; end if;
  select lower(u.email) into actor_email from auth.users u where u.id=uid;
  if actor_email is null then raise exception 'Authenticated email required'; end if;

  insert into public.organizations(id,name,slug,status,plan,is_demo,owner_name,owner_phone,signup_email)
  values(oid,clean_name,clean_slug,'pending_payment','standard',false,nullif(btrim(p_admin_name),''),nullif(btrim(p_phone),''),actor_email);
  insert into public.organization_members(organization_id,auth_user_id,role,is_active)
  values(oid,uid,'agency_admin',true);
  insert into public.app_users(organization_id,email,role,full_name,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
  values(oid,actor_email,'admin',nullif(btrim(p_admin_name),''),'approved',true,true,now(),now(),now())
  on conflict do nothing;
  return query select oid,'pending_payment'::text;
end
$$;

revoke all on function public.cpcm_request_agency_signup(text,text,text,text) from public,anon;
grant execute on function public.cpcm_request_agency_signup(text,text,text,text) to authenticated;
commit;
