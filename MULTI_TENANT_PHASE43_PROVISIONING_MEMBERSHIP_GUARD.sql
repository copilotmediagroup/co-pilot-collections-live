-- Phase 43: first-admin provisioning must reject any prior organization membership, active or inactive.
begin;
create or replace function public.cpcm_platform_provision_organization(p_name text,p_slug text,p_admin_user_id uuid,p_plan text default 'standard',p_is_demo boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare oid uuid:=gen_random_uuid(); clean_name text:=nullif(btrim(p_name),''); clean_slug text:=lower(nullif(btrim(p_slug),'')); existing_oid uuid;
begin
 if not private.is_platform_admin() then raise exception 'Platform admin required'; end if;
 if clean_name is null then raise exception 'Organization name required'; end if;
 if clean_slug is null or clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Organization slug must contain lowercase letters, numbers, and single hyphens only'; end if;
 if p_admin_user_id is null then raise exception 'Initial admin auth user required'; end if;
 if exists(select 1 from public.organizations o where o.slug=clean_slug) then raise exception 'Organization slug already exists'; end if;
 if not exists(select 1 from auth.users u where u.id=p_admin_user_id) then raise exception 'Initial admin auth user does not exist'; end if;
 select m.organization_id into existing_oid from public.organization_members m where m.auth_user_id=p_admin_user_id order by m.created_at limit 1;
 if existing_oid is not null then raise exception 'Initial admin already has an organization membership (%)',existing_oid; end if;
 insert into public.organizations(id,name,slug,status,plan,is_demo) values(oid,clean_name,clean_slug,'active',coalesce(nullif(btrim(p_plan),''),'standard'),coalesce(p_is_demo,false));
 insert into public.organization_members(organization_id,auth_user_id,role,is_active) values(oid,p_admin_user_id,'agency_admin',true);
 return oid;
end $$;
revoke all on function public.cpcm_platform_provision_organization(text,text,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.cpcm_platform_provision_organization(text,text,uuid,text,boolean) to authenticated;
commit;
