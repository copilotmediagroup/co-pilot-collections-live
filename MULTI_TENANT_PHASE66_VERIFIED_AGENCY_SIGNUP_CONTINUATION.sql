-- Phase 66: finish a production agency signup after email verification.
-- Uses trusted auth.users metadata written at signup; creates nothing for ordinary employee/client signups.
begin;
create or replace function public.cpcm_complete_verified_agency_signup()
returns table(organization_id uuid,status text,created boolean)
language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=(select auth.uid()); meta jsonb; requested text; agency text; admin_name text; phone text; actor_email text; slug_base text; clean_slug text; oid uuid; existing_status text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select u.raw_user_meta_data,lower(u.email) into meta,actor_email from auth.users u where u.id=uid;
 if actor_email is null then raise exception 'Authenticated email required'; end if;
 requested:=lower(coalesce(meta->>'requested_role',''));
 if requested <> 'agency_admin' then raise exception 'No verified agency signup is pending for this login'; end if;
 select m.organization_id,o.status into oid,existing_status from public.organization_members m join public.organizations o on o.id=m.organization_id where m.auth_user_id=uid order by m.created_at asc limit 1;
 if oid is not null then return query select oid,existing_status,false; return; end if;
 agency:=nullif(btrim(meta->>'agency_name'),''); admin_name:=nullif(btrim(meta->>'admin_name'),''); phone:=nullif(btrim(meta->>'phone'),'');
 if agency is null then raise exception 'Agency name is missing from verified signup'; end if;
 slug_base:=lower(regexp_replace(regexp_replace(agency,'[^a-zA-Z0-9]+','-','g'),'(^-+|-+$)','','g'));
 if slug_base='' then raise exception 'Agency name cannot create a valid slug'; end if;
 clean_slug:=left(slug_base,40);
 if exists(select 1 from public.organizations o where o.slug=clean_slug) then clean_slug:=left(clean_slug,32)||'-'||substr(replace(uid::text,'-',''),1,7); end if;
 oid:=gen_random_uuid();
 insert into public.organizations(id,name,slug,status,plan,is_demo,owner_name,owner_phone,signup_email)
 values(oid,agency,clean_slug,'pending_payment','standard',false,admin_name,phone,actor_email);
 insert into public.organization_members(organization_id,auth_user_id,role,is_active) values(oid,uid,'agency_admin',true);
 insert into public.app_users(organization_id,email,role,full_name,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
 values(oid,actor_email,'admin',admin_name,'approved',true,true,now(),now(),now()) on conflict do nothing;
 return query select oid,'pending_payment'::text,true;
end
$$;
revoke all on function public.cpcm_complete_verified_agency_signup() from public,anon;
grant execute on function public.cpcm_complete_verified_agency_signup() to authenticated;
commit;
