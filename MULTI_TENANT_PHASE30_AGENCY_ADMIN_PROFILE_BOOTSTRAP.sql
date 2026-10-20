-- Phase 30: bootstrap the signed-in agency admin's application profile from trusted membership.
begin;
create or replace function public.cpcm_bootstrap_current_agency_admin_profile()
returns public.app_users
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  actor_email text;
  result public.app_users;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select m.organization_id into oid
  from public.organization_members m
  join public.organizations o on o.id=m.organization_id
  where m.auth_user_id=uid and m.is_active=true
    and m.role in ('agency_admin','admin') and o.status in ('active','demo')
  limit 1;
  if oid is null then raise exception 'Active agency administrator membership required'; end if;
  select lower(trim(u.email::text)) into actor_email from auth.users u where u.id=uid;
  if coalesce(actor_email,'')='' then raise exception 'Authenticated user email required'; end if;

  update public.app_users
     set role='admin', approval_status='approved', is_approved=true, is_active=true,
         last_seen_at=now(), updated_at=now()
   where organization_id=oid and lower(email)=actor_email
   returning * into result;

  if result is null then
    insert into public.app_users(organization_id,email,role,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values(oid,actor_email,'admin','approved',true,true,now(),now(),now())
    returning * into result;
  end if;
  return result;
end $$;
revoke all on function public.cpcm_bootstrap_current_agency_admin_profile() from public,anon;
grant execute on function public.cpcm_bootstrap_current_agency_admin_profile() to authenticated;
commit;
