-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 4
-- NON-PRODUCTION FIRST. Converts legacy single-company configuration keys into tenant-qualified keys.
-- Prerequisite: Phase 1 has added organization_id and backfilled existing rows.

begin;

-- company_settings: legacy PK(setting_key) becomes UNIQUE(organization_id, setting_key).
do $$ declare c record; begin
 if to_regclass('public.company_settings') is not null then
  for c in select conname from pg_constraint where conrelid='public.company_settings'::regclass and contype='p'
  loop execute format('alter table public.company_settings drop constraint %I',c.conname); end loop;
  alter table public.company_settings add column if not exists id uuid default gen_random_uuid();
  update public.company_settings set id=gen_random_uuid() where id is null;
  alter table public.company_settings alter column id set not null;
  alter table public.company_settings add constraint company_settings_pkey primary key(id);
  create unique index if not exists uq_company_settings_org_key on public.company_settings(organization_id,setting_key);
 end if;
end $$;

-- voice broadcast settings: preserve id='default' semantics within each organization.
do $$ declare c record; begin
 if to_regclass('public.voice_broadcast_settings') is not null then
  for c in select conname from pg_constraint where conrelid='public.voice_broadcast_settings'::regclass and contype='p'
  loop execute format('alter table public.voice_broadcast_settings drop constraint %I',c.conname); end loop;
  create unique index if not exists uq_voice_broadcast_settings_org_id on public.voice_broadcast_settings(organization_id,id);
 end if;
end $$;

-- Boolean singleton AI configs: id=true remains valid once qualified by organization.
do $$ declare t text; c record; begin
 foreach t in array array['ai_call_runtime_config','ai_caller_id_config','ai_bland_pathway_config'] loop
  if to_regclass('public.'||t) is not null then
   for c in select conname from pg_constraint where conrelid=to_regclass('public.'||t) and contype='p'
   loop execute format('alter table public.%I drop constraint %I',t,c.conname); end loop;
   execute format('create unique index if not exists %I on public.%I(organization_id,id)','uq_'||t||'_org_id',t);
  end if;
 end loop;
end $$;

commit;

-- PostgREST upserts must now use tenant-qualified conflict targets:
-- company_settings: on_conflict=organization_id,setting_key
-- voice_broadcast_settings: on_conflict=organization_id,id
-- AI singleton configs should be selected/updated under tenant RLS; service-role edge functions MUST explicitly filter organization_id.
