-- Phase 31: tenant-safe agency join codes for ordinary employee/client signup.
begin;
create table if not exists public.organization_join_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  allowed_role text not null default 'employee' check (allowed_role in ('employee','client')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique(code)
);
alter table public.organization_join_codes enable row level security;

create or replace function public.cpcm_join_organization(p_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oid uuid; join_role text; actor_email text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select j.organization_id,j.allowed_role into oid,join_role
 from public.organization_join_codes j join public.organizations o on o.id=j.organization_id
 where lower(j.code)=lower(trim(p_code)) and j.is_active=true
   and (j.expires_at is null or j.expires_at>now()) and o.status in ('active','demo') limit 1;
 if oid is null then raise exception 'Invalid or expired organization join code'; end if;
 if exists(select 1 from public.organization_members m where m.auth_user_id=uid and m.is_active=true and m.organization_id<>oid) then raise exception 'User already belongs to another organization'; end if;
 select lower(trim(u.email::text)) into actor_email from auth.users u where u.id=uid;
 if coalesce(actor_email,'')='' then raise exception 'Authenticated user email required'; end if;
 insert into public.organization_members(organization_id,auth_user_id,role,is_active)
 values(oid,uid,join_role,true)
 on conflict (organization_id,auth_user_id) do update set role=excluded.role,is_active=true,updated_at=now();
 insert into public.app_users(organization_id,email,role,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
 values(oid,actor_email,join_role,'pending',false,false,now(),now(),now())
 on conflict (organization_id,email) do update set updated_at=now(),last_seen_at=now();
 return oid;
end $$;
revoke all on function public.cpcm_join_organization(text) from public,anon;
grant execute on function public.cpcm_join_organization(text) to authenticated;
commit;
