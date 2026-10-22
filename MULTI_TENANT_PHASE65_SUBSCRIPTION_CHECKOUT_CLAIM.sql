-- Phase 65: service-only checkout claim/finalization helpers for the SaaS billing Edge Function.
-- Browser users prepare a checkout; only the service role may claim or finalize it.
begin;

alter table public.subscription_checkout_attempts add column if not exists submitted_at timestamptz;
alter table public.subscription_checkout_attempts add column if not exists completed_at timestamptz;
alter table public.subscription_checkout_attempts add column if not exists failure_message text;

create or replace function public.cpcm_service_claim_subscription_checkout(p_checkout_id uuid)
returns table(checkout_id uuid,organization_id uuid,organization_name text,plan_code text,plan_name text,billing_interval text,amount_cents integer,owner_email text)
language plpgsql security definer set search_path=''
as $$
declare uid uuid;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 update public.subscription_checkout_attempts c set status='submitted',submitted_at=coalesce(c.submitted_at,now()),updated_at=now()
 where c.id=p_checkout_id and c.status='prepared'
 returning c.auth_user_id into uid;
 if uid is null then raise exception 'Checkout is unavailable or already submitted'; end if;
 return query
 select c.id,c.organization_id,o.name,c.plan_code,p.display_name,c.billing_interval,c.amount_cents,coalesce(u.email,'')::text
 from public.subscription_checkout_attempts c
 join public.organizations o on o.id=c.organization_id and coalesce(o.is_demo,false)=false
 join public.saas_plan_catalog p on p.plan_code=c.plan_code and p.is_active=true
 join auth.users u on u.id=c.auth_user_id
 where c.id=p_checkout_id and c.auth_user_id=uid;
end
$$;

create or replace function public.cpcm_service_finalize_subscription_checkout(p_checkout_id uuid,p_status text,p_provider_reference text default null,p_failure_message text default null)
returns text language plpgsql security definer set search_path=''
as $$
declare clean text:=lower(coalesce(nullif(btrim(p_status),''),'failed'));
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 if clean not in ('paid','failed','cancelled') then raise exception 'Invalid checkout final status'; end if;
 update public.subscription_checkout_attempts
 set status=clean,provider_reference=coalesce(nullif(btrim(p_provider_reference),''),provider_reference),failure_message=case when clean='failed' then nullif(left(coalesce(p_failure_message,''),500),'') else null end,completed_at=now(),updated_at=now()
 where id=p_checkout_id and status='submitted';
 if not found then raise exception 'Submitted checkout not found'; end if;
 return clean;
end
$$;

revoke all on function public.cpcm_service_claim_subscription_checkout(uuid) from public,anon,authenticated;
revoke all on function public.cpcm_service_finalize_subscription_checkout(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_claim_subscription_checkout(uuid) to service_role;
grant execute on function public.cpcm_service_finalize_subscription_checkout(uuid,text,text,text) to service_role;
commit;
