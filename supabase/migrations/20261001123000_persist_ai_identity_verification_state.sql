alter table public.ai_real_call_attempts
 add column if not exists identity_verified_at timestamptz,
 add column if not exists identity_verification_method text,
 add column if not exists identity_verification_failed_attempts integer not null default 0,
 add column if not exists identity_verification_locked_at timestamptz;

create or replace function public.cpcm_record_ai_identity_verification(p_attempt_id uuid,p_verified boolean,p_method text default 'mailing_zip_code')
returns table(verified boolean,failed_attempts integer,locked boolean)
language plpgsql security definer set search_path=public as $$
declare v public.ai_real_call_attempts%rowtype; next_failures integer;
begin
 select * into v from public.ai_real_call_attempts where id=p_attempt_id for update;
 if not found then raise exception 'attempt not found'; end if;
 if v.identity_verification_locked_at is not null then return query select false,v.identity_verification_failed_attempts,true; return; end if;
 if v.identity_verified_at is not null then return query select true,v.identity_verification_failed_attempts,false; return; end if;
 if p_verified then
  update public.ai_real_call_attempts set identity_verified_at=now(),identity_verification_method=left(coalesce(p_method,'mailing_zip_code'),100),updated_at=now() where id=p_attempt_id;
  return query select true,v.identity_verification_failed_attempts,false; return;
 end if;
 next_failures:=v.identity_verification_failed_attempts+1;
 update public.ai_real_call_attempts set identity_verification_failed_attempts=next_failures,identity_verification_locked_at=case when next_failures>=2 then now() else null end,updated_at=now() where id=p_attempt_id;
 return query select false,next_failures,(next_failures>=2);
end $$;
revoke all on function public.cpcm_record_ai_identity_verification(uuid,boolean,text) from public,anon,authenticated;
