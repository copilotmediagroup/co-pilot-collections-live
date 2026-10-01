create table if not exists public.ai_bland_pathway_config(
 id boolean primary key default true check(id=true), pathway_id text, pathway_version text,
 verification_status text not null default 'unconfigured' check(verification_status in ('unconfigured','configured_unverified','synthetic_verified')),
 enabled_for_real_calls boolean not null default false, verified_by_email text, verified_at timestamptz, updated_at timestamptz not null default now()
);
insert into public.ai_bland_pathway_config(id,verification_status,enabled_for_real_calls) values(true,'unconfigured',false) on conflict(id) do nothing;
alter table public.ai_bland_pathway_config enable row level security;
drop policy if exists ai_bland_pathway_admin_select on public.ai_bland_pathway_config;
create policy ai_bland_pathway_admin_select on public.ai_bland_pathway_config for select to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists ai_bland_pathway_admin_write on public.ai_bland_pathway_config;
create policy ai_bland_pathway_admin_write on public.ai_bland_pathway_config for all to authenticated using(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check(lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
