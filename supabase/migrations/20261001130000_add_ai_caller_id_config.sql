create table if not exists public.ai_caller_id_config(
 id boolean primary key default true check(id=true), phone_number text, display_label text, provider text not null default 'bland',
 verification_status text not null default 'unconfigured' check(verification_status in ('unconfigured','observed_unverified','verified')),
 enabled_for_real_calls boolean not null default false, verified_by_email text, verified_at timestamptz, updated_at timestamptz not null default now()
);
insert into public.ai_caller_id_config(id,phone_number,display_label,verification_status,enabled_for_real_calls)
values(true,'+14707069719','Observed Bland test caller ID','observed_unverified',false) on conflict(id) do nothing;
alter table public.ai_caller_id_config enable row level security;
drop policy if exists ai_caller_id_admin_select on public.ai_caller_id_config;
create policy ai_caller_id_admin_select on public.ai_caller_id_config for select to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_caller_id_admin_write on public.ai_caller_id_config;
create policy ai_caller_id_admin_write on public.ai_caller_id_config for all to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
