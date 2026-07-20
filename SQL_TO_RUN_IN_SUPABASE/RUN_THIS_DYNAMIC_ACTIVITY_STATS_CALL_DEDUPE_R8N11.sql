-- CO PILOT COLLECTIONS MANAGER
-- DYNAMIC ACTIVITY + CALL STATISTICS R8N11
-- Run once in the matching Supabase project after deploying the matching ZIP.
-- Safe to run more than once.

begin;

alter table if exists public.accounts
  add column if not exists last_called_at timestamptz,
  add column if not exists last_call_result text,
  add column if not exists last_call_outcome text,
  add column if not exists next_call_at timestamptz,
  add column if not exists call_count integer not null default 0,
  add column if not exists contact_count integer not null default 0,
  add column if not exists rpc_count integer not null default 0,
  add column if not exists voicemail_count integer not null default 0,
  add column if not exists no_answer_count integer not null default 0,
  add column if not exists wrong_number_count integer not null default 0,
  add column if not exists refused_count integer not null default 0,
  add column if not exists last_worked_at timestamptz,
  add column if not exists do_not_call boolean not null default false,
  add column if not exists disputed_flag boolean not null default false,
  add column if not exists wrong_number_flag boolean not null default false;

alter table if exists public.call_results
  add column if not exists attempt_id text,
  add column if not exists attempt_status text not null default 'completed',
  add column if not exists event_type text not null default 'result',
  add column if not exists dialed_at timestamptz,
  add column if not exists direction text,
  add column if not exists outcome_category text,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists answered_by text,
  add column if not exists is_contact boolean not null default false,
  add column if not exists is_rpc boolean not null default false,
  add column if not exists is_promise boolean not null default false,
  add column if not exists is_callback boolean not null default false,
  add column if not exists is_wrong_number boolean not null default false,
  add column if not exists next_call_at timestamptz,
  add column if not exists account_balance_snapshot numeric not null default 0,
  add column if not exists call_source text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.activity_logs
  add column if not exists event_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_call_results_attempt_id_unique
  on public.call_results(attempt_id)
  where attempt_id is not null;

create unique index if not exists idx_activity_logs_event_key_unique
  on public.activity_logs(event_key)
  where event_key is not null;

create index if not exists idx_call_results_created_by_created_at
  on public.call_results(created_by_email, created_at desc);
create index if not exists idx_call_results_account_created_at
  on public.call_results(account_id, created_at desc);
create index if not exists idx_activity_logs_created_by_created_at
  on public.activity_logs(created_by_email, created_at desc);

create or replace function public.cpcm_record_call_attempt(
  p_account_id uuid,
  p_phone_number text,
  p_attempt_id text,
  p_created_by_email text default null,
  p_call_source text default 'Phone Link'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_call_id uuid;
  v_email text := lower(coalesce(nullif(auth.jwt()->>'email',''), nullif(p_created_by_email,''), 'unknown'));
  v_count integer := 0;
  v_inserted boolean := false;
begin
  insert into public.call_results(
    account_id, phone_number, call_result, disposition, notes,
    result_at, created_by_email, created_at,
    attempt_id, attempt_status, event_type, dialed_at,
    direction, outcome_category, call_source, updated_at
  ) values (
    p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
    'Call Attempt', 'Pending Outcome', 'Phone application launched from Co Pilot Collections Manager.',
    v_now, v_email, v_now,
    p_attempt_id, 'pending', 'attempt', v_now,
    'Outbound', 'Pending Outcome', coalesce(nullif(p_call_source,''),'Phone Link'), v_now
  )
  on conflict do nothing
  returning id into v_call_id;

  if v_call_id is not null then
    v_inserted := true;

    update public.accounts
       set last_contact_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           last_called_at = v_now,
           call_count = coalesce(call_count,0) + 1,
           last_worked_at = v_now,
           updated_at = v_now
     where id = p_account_id
     returning call_count into v_count;

    insert into public.activity_logs(
      account_id, action_type, action_text, phone_number,
      created_by_email, created_at, event_key, metadata
    ) values (
      p_account_id, 'Call Attempt',
      'Outbound call attempt launched to ' || regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      v_email, v_now, 'call-attempt:' || p_attempt_id,
      jsonb_build_object('attempt_id',p_attempt_id,'source',coalesce(nullif(p_call_source,''),'Phone Link'))
    ) on conflict do nothing;
  else
    select id into v_call_id
      from public.call_results
     where attempt_id = p_attempt_id
     order by created_at desc
     limit 1;
    select coalesce(call_count,0) into v_count from public.accounts where id=p_account_id;
  end if;

  return jsonb_build_object(
    'call_result_id', v_call_id,
    'attempt_id', p_attempt_id,
    'dialed_at', v_now,
    'call_count', coalesce(v_count,0),
    'inserted', v_inserted
  );
end;
$$;

create or replace function public.cpcm_complete_call_attempt(
  p_account_id uuid,
  p_attempt_id text,
  p_phone_number text,
  p_call_result text,
  p_disposition text,
  p_direction text default 'Outbound',
  p_outcome_category text default 'No Contact',
  p_duration_seconds integer default 0,
  p_answered_by text default null,
  p_is_contact boolean default false,
  p_is_rpc boolean default false,
  p_is_promise boolean default false,
  p_is_callback boolean default false,
  p_is_wrong_number boolean default false,
  p_next_call_at timestamptz default null,
  p_account_balance_snapshot numeric default 0,
  p_notes text default null,
  p_created_by_email text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_call_id uuid;
  v_existing_status text;
  v_email text := lower(coalesce(nullif(auth.jwt()->>'email',''), nullif(p_created_by_email,''), 'unknown'));
  v_new_call boolean := false;
  v_duplicate boolean := false;
begin
  if p_attempt_id is not null and p_attempt_id <> '' then
    select id, attempt_status
      into v_call_id, v_existing_status
      from public.call_results
     where attempt_id = p_attempt_id
     order by created_at desc
     limit 1
     for update;
  end if;

  if v_call_id is not null and coalesce(v_existing_status,'pending') = 'completed' then
    v_duplicate := true;
  elsif v_call_id is not null then
    update public.call_results
       set phone_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           call_result = coalesce(nullif(p_call_result,''),'No Answer'),
           disposition = coalesce(nullif(p_disposition,''),coalesce(nullif(p_call_result,''),'No Answer')),
           notes = p_notes,
           result_at = v_now,
           attempt_status = 'completed',
           event_type = 'result',
           direction = coalesce(nullif(p_direction,''),'Outbound'),
           outcome_category = coalesce(nullif(p_outcome_category,''),'No Contact'),
           duration_seconds = greatest(coalesce(p_duration_seconds,0),0),
           answered_by = p_answered_by,
           is_contact = coalesce(p_is_contact,false),
           is_rpc = coalesce(p_is_rpc,false),
           is_promise = coalesce(p_is_promise,false),
           is_callback = coalesce(p_is_callback,false),
           is_wrong_number = coalesce(p_is_wrong_number,false),
           next_call_at = p_next_call_at,
           account_balance_snapshot = coalesce(p_account_balance_snapshot,0),
           call_source = coalesce(nullif(call_source,''),'Phone Link'),
           updated_at = v_now
     where id = v_call_id;
  else
    v_new_call := true;
    insert into public.call_results(
      account_id, phone_number, call_result, disposition, notes,
      result_at, created_by_email, created_at,
      attempt_id, attempt_status, event_type, dialed_at,
      direction, outcome_category, duration_seconds, answered_by,
      is_contact, is_rpc, is_promise, is_callback, is_wrong_number,
      next_call_at, account_balance_snapshot, call_source, updated_at
    ) values (
      p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      coalesce(nullif(p_call_result,''),'No Answer'),
      coalesce(nullif(p_disposition,''),coalesce(nullif(p_call_result,''),'No Answer')),
      p_notes, v_now, v_email, v_now,
      coalesce(nullif(p_attempt_id,''),'result-'||gen_random_uuid()::text),
      'completed','result',v_now,
      coalesce(nullif(p_direction,''),'Outbound'),
      coalesce(nullif(p_outcome_category,''),'No Contact'),
      greatest(coalesce(p_duration_seconds,0),0),p_answered_by,
      coalesce(p_is_contact,false),coalesce(p_is_rpc,false),coalesce(p_is_promise,false),
      coalesce(p_is_callback,false),coalesce(p_is_wrong_number,false),
      p_next_call_at,coalesce(p_account_balance_snapshot,0),'Manual Call Result',v_now
    ) returning id into v_call_id;
  end if;

  if not v_duplicate then
    update public.accounts
       set status = coalesce(nullif(p_disposition,''),status),
           disposition = coalesce(nullif(p_disposition,''),disposition),
           last_contact_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           last_called_at = v_now,
           last_call_result = coalesce(nullif(p_call_result,''),'No Answer'),
           last_call_outcome = coalesce(nullif(p_outcome_category,''),'No Contact'),
           next_call_at = p_next_call_at,
           call_count = coalesce(call_count,0) + case when v_new_call then 1 else 0 end,
           contact_count = coalesce(contact_count,0) + case when coalesce(p_is_contact,false) then 1 else 0 end,
           rpc_count = coalesce(rpc_count,0) + case when coalesce(p_is_rpc,false) then 1 else 0 end,
           voicemail_count = coalesce(voicemail_count,0) + case when lower(coalesce(p_call_result,'')) like '%voicemail%' then 1 else 0 end,
           no_answer_count = coalesce(no_answer_count,0) + case when lower(coalesce(p_call_result,'')) = 'no answer' then 1 else 0 end,
           wrong_number_count = coalesce(wrong_number_count,0) + case when coalesce(p_is_wrong_number,false) then 1 else 0 end,
           refused_count = coalesce(refused_count,0) + case when lower(coalesce(p_call_result,'')) = 'refused to pay' then 1 else 0 end,
           do_not_call = case when lower(coalesce(p_call_result,''))='dnc' then true else do_not_call end,
           disputed_flag = case when lower(coalesce(p_call_result,''))='dispute' then true else disputed_flag end,
           wrong_number_flag = case when coalesce(p_is_wrong_number,false) then true else wrong_number_flag end,
           last_worked_at = v_now,
           updated_at = v_now
     where id = p_account_id;

    insert into public.activity_logs(
      account_id, action_type, action_text, phone_number,
      old_status, new_status, created_by_email, created_at,
      event_key, metadata
    ) values (
      p_account_id, 'Call Result',
      coalesce(nullif(p_call_result,''),'No Answer') ||
        case when coalesce(p_notes,'')<>'' then '. '||p_notes else '' end,
      regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      null,coalesce(nullif(p_disposition,''),p_call_result),v_email,v_now,
      'call-result:'||coalesce(nullif(p_attempt_id,''),v_call_id::text),
      jsonb_build_object('attempt_id',p_attempt_id,'call_result_id',v_call_id,'outcome_category',p_outcome_category)
    ) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'call_result_id',v_call_id,
    'attempt_id',p_attempt_id,
    'completed',not v_duplicate,
    'duplicate',v_duplicate,
    'created_without_attempt',v_new_call,
    'result_at',v_now
  );
end;
$$;

grant execute on function public.cpcm_record_call_attempt(uuid,text,text,text,text) to authenticated;
grant execute on function public.cpcm_complete_call_attempt(uuid,text,text,text,text,text,text,integer,text,boolean,boolean,boolean,boolean,boolean,timestamptz,numeric,text,text) to authenticated;

commit;
