-- Phase 53: make client portal role/access changes authoritative in both profile and membership.
begin;
create or replace function public.cpcm_admin_save_client_portal_access(target_email text, contact_name text, company_name text, approved boolean, portfolio_names text[], can_view_accounts boolean, can_view_payments boolean, can_download_reports boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor text:=public.current_app_email(); oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,''))); p text; target_uid uuid; existing_role text;
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if target='' then raise exception 'target_email required'; end if;
 select id into target_uid from auth.users where lower(email::text)=target limit 1;
 if target_uid is null then raise exception 'client must create an authenticated account first'; end if;
 select lower(role) into existing_role from public.organization_members where organization_id=oid and auth_user_id=target_uid limit 1;
 if existing_role is null then raise exception 'client must join this organization before portal access can be configured'; end if;
 if existing_role in ('agency_admin','admin','recruiter') then raise exception 'staff/admin membership cannot be converted to client'; end if;
 update public.organization_members set role='client',is_active=approved,updated_at=now() where organization_id=oid and auth_user_id=target_uid;
 update public.app_users set role='client',full_name=coalesce(nullif(trim(contact_name),''),full_name),client_contact_name=nullif(trim(contact_name),''),client_company_name=nullif(trim(company_name),''),client_portal_enabled=approved,client_can_view_accounts=coalesce(can_view_accounts,true),client_can_view_payments=coalesce(can_view_payments,true),client_can_download_reports=coalesce(can_download_reports,true),approval_status=case when approved then 'approved' else 'pending' end,is_approved=approved,is_active=approved,updated_at=now() where organization_id=oid and lower(email)=target;
 if not found then raise exception 'client profile must exist before portal access can be configured'; end if;
 delete from public.client_portfolio_assignments where organization_id=oid and lower(client_email)=target;
 foreach p in array coalesce(portfolio_names,array[]::text[]) loop
  if nullif(trim(p),'') is not null then insert into public.client_portfolio_assignments(organization_id,client_email,portfolio_name,assigned_by_email,updated_at) values(oid,target,trim(p),actor,now()) on conflict(organization_id,client_email,portfolio_name) do update set assigned_by_email=excluded.assigned_by_email,updated_at=now(); end if;
 end loop;
 return jsonb_build_object('ok',true,'email',target,'approved',approved,'portfolio_count',coalesce(array_length(portfolio_names,1),0));
end $$;
create or replace function public.cpcm_admin_disable_client_portal_access(target_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,''))); target_uid uuid;
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select id into target_uid from auth.users where lower(email::text)=target limit 1;
 update public.app_users set client_portal_enabled=false,approval_status='pending',is_approved=false,is_active=false,updated_at=now() where organization_id=oid and lower(email)=target and lower(role)='client';
 if target_uid is not null then update public.organization_members set is_active=false,updated_at=now() where organization_id=oid and auth_user_id=target_uid and lower(role)='client'; end if;
 return jsonb_build_object('ok',true,'email',target);
end $$;
revoke all on function public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) from public,anon;
grant execute on function public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) to authenticated;
revoke all on function public.cpcm_admin_disable_client_portal_access(text) from public,anon;
grant execute on function public.cpcm_admin_disable_client_portal_access(text) to authenticated;
commit;
