-- Combined structural privilege audit for onboarding phases 30-33. Read-only transaction.
begin;
do $$ declare sig text; d text; begin
 foreach sig in array array[
 'public.cpcm_bootstrap_current_agency_admin_profile()',
 'public.cpcm_join_organization(text)',
 'public.cpcm_admin_manage_staff_user(text,text,text)',
 'public.cpcm_admin_create_join_code(text,timestamp with time zone)',
 'public.cpcm_admin_list_join_codes()',
 'public.cpcm_admin_set_join_code_active(uuid,boolean)'
 ] loop
  if to_regprocedure(sig) is null then raise exception 'ONBOARDING AUDIT BLOCKED: missing %',sig; end if;
  if has_function_privilege('anon',sig,'EXECUTE') then raise exception 'ONBOARDING AUDIT BLOCKED: anon can execute %',sig; end if;
  if not has_function_privilege('authenticated',sig,'EXECUTE') then raise exception 'ONBOARDING AUDIT BLOCKED: authenticated cannot reach guarded %',sig; end if;
 end loop;
 select pg_get_functiondef('public.cpcm_join_organization(text)'::regprocedure) into d;
 if d ilike '%agency_admin%' or d ilike '%role=''admin''%' then raise exception 'ONBOARDING AUDIT BLOCKED: ordinary join path exposes admin role'; end if;
 select pg_get_functiondef('public.cpcm_bootstrap_current_agency_admin_profile()'::regprocedure) into d;
 if d not ilike '%organization_members%' or d not ilike '%agency_admin%' then raise exception 'ONBOARDING AUDIT BLOCKED: admin bootstrap lacks trusted membership'; end if;
 raise notice 'PHASE30-33 ONBOARDING SECURITY AUDIT PASSED';
end $$;
rollback;
