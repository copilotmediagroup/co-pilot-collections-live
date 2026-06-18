
-- FORCE LETTER SETTINGS FIX
-- Run this in Supabase SQL Editor if Authorized By still shows your email or letter body templates will not save.

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select_authenticated on public.company_settings;
drop policy if exists company_settings_admin_insert on public.company_settings;
drop policy if exists company_settings_admin_update on public.company_settings;
drop policy if exists company_settings_admin_delete on public.company_settings;

create policy company_settings_select_authenticated
on public.company_settings for select
to authenticated
using (auth.role() = 'authenticated');

create policy company_settings_admin_insert
on public.company_settings for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_update
on public.company_settings for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_delete
on public.company_settings for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

insert into public.company_settings(setting_key, setting_value, updated_by_email, updated_at)
values
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system',now()),
  ('pdf_letter_templates_json','{}','system',now())
on conflict (setting_key) do nothing;

-- Repair older broken setting where Authorized By was saved as the admin email.
update public.company_settings
set setting_value='Co Pilot Collections Manager',
    updated_by_email='system',
    updated_at=now()
where setting_key='pdf_authorized_by_default'
  and (
    setting_value is null
    or trim(setting_value) = ''
    or setting_value like '%@%'
  );
