
-- LETTER SETTINGS: AUTHORIZED BY DEFAULT + EDITABLE LETTER BODY TEMPLATES
-- Run this if the letter settings cannot save to Supabase.

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

insert into public.company_settings(setting_key, setting_value, updated_by_email)
values
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system'),
  ('pdf_letter_templates_json','{}','system')
on conflict (setting_key) do nothing;
