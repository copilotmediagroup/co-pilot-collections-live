-- Phase 42: make pending join requests idempotent and prevent join-code role rewriting/replay.
begin;
create or replace function public.cpcm_join_organization(p_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oid uuid; join_role text; actor_email text; existing_org uuid; existing_role text; existing_active boolean;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select j.organization_id,j.allowed_role into oid,join_role
 from public.organization_join_codes j join public.organizations o on o.id=j.organization_id
 where lower(j.code)=lower(trim(p_code)) and j.is_active=true and (j.expires_at is null or j.expires_at>now()) and o.status in ('active','demo') limit 1;
 if oid is null then raise exception 'Invalid or expired organization join code'; end if;
 select m.organization_id,m.role,m.is_active into existing_org,existing_role,existing_active from public.organization_members m where m.auth_user_id=uid order by m.created_at limit 1;
 if existing_org is not null and existing_org<>oid then raise exception 'User already has an organization membership'; end if;
 if existing_org=oid then
   if existing_active then return oid; end if;
   if lower(coalesce(existing_role,''))<>join_role then raise exception 'Pending organization request already exists with a different role'; end if;
 end if;
 select lower(trim(u.email::text)) into actor_email from auth.users u where u.id=uid;
 if coalesce(actor_email,'')='' then raise exception 'Authenticated user email required'; end if;
 insert into public.organization_members(organization_id,auth_user_id,role,is_active)
 values(oid,uid,join_role,false)
 on conflict (organization_id,auth_user_id) do update set updated_at=now();
 insert into public.app_users(organization_id,email,role,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
 values(oid,actor_email,join_role,'pending',false,false,now(),now(),now())
 on conflict (organization_id,email) do update set updated_at=now(),last_seen_at=now();
 return oid;
end $$;
revoke all on function public.cpcm_join_organization(text) from public,anon;
grant execute on function public.cpcm_join_organization(text) to authenticated;
commit;
