\set ON_ERROR_STOP on
BEGIN;
REVOKE ALL ON FUNCTION public.cpcm_record_call_attempt(uuid,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cpcm_complete_call_attempt(uuid,text,text,text,text,text,text,integer,text,boolean,boolean,boolean,boolean,boolean,timestamptz,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cpcm_record_call_attempt(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_complete_call_attempt(uuid,text,text,text,text,text,text,integer,text,boolean,boolean,boolean,boolean,boolean,timestamptz,numeric,text,text) TO authenticated;
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('cpcm_record_call_attempt','cpcm_complete_call_attempt')
     AND has_function_privilege('anon',p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'CALL RPC EXECUTE REPAIR FAILED: anon still has EXECUTE'; END IF;
 RAISE NOTICE 'DEMO CALL RPC EXECUTE REPAIR PASSED: call activity RPCs are authenticated-only.';
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
