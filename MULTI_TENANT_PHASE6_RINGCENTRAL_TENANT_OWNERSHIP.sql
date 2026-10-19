-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 6
-- NON-PRODUCTION FIRST. RingCentral mappings/call records must carry tenant ownership.
begin;

-- ringcentral_call_records is already covered by Phase 1, but its legacy primary key can collide
-- if multiple agencies use the same provider/session identifiers. Preserve a surrogate key and
-- tenant-qualified provider id uniqueness.
do $$ declare c record; begin
 if to_regclass('public.ringcentral_call_records') is not null then
  for c in select conname from pg_constraint where conrelid='public.ringcentral_call_records'::regclass and contype='p'
  loop execute format('alter table public.ringcentral_call_records drop constraint %I',c.conname); end loop;
  alter table public.ringcentral_call_records add column if not exists id uuid default gen_random_uuid();
  update public.ringcentral_call_records set id=gen_random_uuid() where id is null;
  alter table public.ringcentral_call_records alter column id set not null;
  alter table public.ringcentral_call_records add constraint ringcentral_call_records_pkey primary key(id);
  create unique index if not exists uq_ringcentral_call_records_org_rc on public.ringcentral_call_records(organization_id,rc_call_id);
 end if;
end $$;

-- This table exists in LIVE even though its original CREATE migration is absent from the repo snapshot.
-- Add ownership defensively and backfill legacy mappings to the legacy tenant.
do $$ begin
 if to_regclass('public.ringcentral_user_mappings') is not null then
  alter table public.ringcentral_user_mappings add column if not exists organization_id uuid references public.organizations(id);
  update public.ringcentral_user_mappings set organization_id='00000000-0000-4000-8000-000000000001'::uuid where organization_id is null;
  alter table public.ringcentral_user_mappings alter column organization_id set not null;
  create index if not exists idx_ringcentral_user_mappings_org on public.ringcentral_user_mappings(organization_id);
 end if;
end $$;
commit;
