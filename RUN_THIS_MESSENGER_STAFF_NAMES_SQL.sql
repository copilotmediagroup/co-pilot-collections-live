-- Co Pilot Collections Manager - Messenger Staff Names SQL (LIVE)
-- Run this in the LIVE Supabase SQL Editor before testing the Messenger Names package.

alter table public.app_users add column if not exists full_name text;

create or replace function public.cpcm_update_staff_display_name(target_email text, new_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  target text := lower(trim(coalesce(target_email,'')));
  clean text := nullif(trim(coalesce(new_full_name,'')),'');
  actor_is_admin boolean := lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com');
begin
  if actor_email = '' then
    raise exception 'not authenticated';
  end if;

  if target = '' then
    raise exception 'target_email required';
  end if;

  if not (actor_is_admin or actor_email = target) then
    raise exception 'not allowed';
  end if;

  update public.app_users
     set full_name = clean,
         updated_at = now()
   where lower(email) = target;

  if not found then
    insert into public.app_users (email, role, full_name, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
    values (
      target,
      case when target = 'afinch2678@gmail.com' then 'admin' else 'employee' end,
      clean,
      case when target = 'afinch2678@gmail.com' then 'approved' else 'pending' end,
      case when target = 'afinch2678@gmail.com' then true else false end,
      case when target = 'afinch2678@gmail.com' then true else false end,
      now(), now(), now()
    );
  end if;

  return jsonb_build_object('ok', true, 'email', target, 'full_name', clean);
end;
$$;

grant execute on function public.cpcm_update_staff_display_name(text,text) to authenticated;

-- Staff directory RPC for Messenger.
-- This lets admin/employee Messenger load all active staff names/statuses without exposing debtor data.
create or replace function public.cpcm_staff_directory()
returns table(
  email text,
  role text,
  full_name text,
  approval_status text,
  is_approved boolean,
  is_active boolean,
  last_seen_at timestamptz,
  updated_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.email,
    u.role,
    u.full_name,
    u.approval_status,
    u.is_approved,
    u.is_active,
    u.last_seen_at,
    u.updated_at,
    u.created_at
  from public.app_users u
  where lower(coalesce(u.role,'')) in ('admin','employee')
    and coalesce(u.is_active,true) is not false
    and lower(coalesce(u.approval_status,'')) not in ('removed','rejected','fired')
  order by lower(u.email);
$$;

grant execute on function public.cpcm_staff_directory() to authenticated;


-- Keep the LIVE admin's real name set by default.
update public.app_users
   set full_name = coalesce(nullif(full_name,''),'Antonio Finch'),
       role = 'admin',
       approval_status = 'approved',
       is_approved = true,
       is_active = true,
       updated_at = now()
 where lower(email) = 'afinch2678@gmail.com';

notify pgrst, 'reload schema';
