-- Phase 13: tenant-safe commissions and payment approval overrides. NON-PRODUCTION FIRST.
begin;

create or replace function public.cpcm_confirm_payment_sale_credit(target_approval_request_id uuid,target_employee_email text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare req public.payment_approval_requests%rowtype; staff_count integer; oid uuid:=private.current_organization_id(); actor text:=public.current_app_email();
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select count(*) into staff_count from public.app_users where organization_id=oid and lower(email)=lower(target_employee_email) and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if staff_count<>1 then raise exception 'Active approved employee not found in current organization'; end if;
 select * into req from public.payment_approval_requests where organization_id=oid and id=target_approval_request_id for update;
 if not found then raise exception 'Payment request not found'; end if;
 if lower(coalesce(req.status,''))<>'pending' then raise exception 'Sale credit can only be confirmed before Admin processes a pending payment'; end if;
 update public.payment_approval_requests set sale_credit_email=lower(target_employee_email),sale_credit_confirmed_by_email=actor,sale_credit_confirmed_at=now(),updated_at=now() where organization_id=oid and id=req.id;
 return jsonb_build_object('ok',true,'approval_request_id',req.id,'sale_credit_email',lower(target_employee_email));
end $$;

create or replace function public.cpcm_record_approved_commission(target_approval_request_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare req public.payment_approval_requests%rowtype; led public.payments_ledger%rowtype; rate numeric; eid uuid; earned numeric; actor text:=public.current_app_email(); credit_email text; oid uuid:=private.current_organization_id();
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select * into req from public.payment_approval_requests where organization_id=oid and id=target_approval_request_id for update;
 if not found then raise exception 'Approval request not found'; end if;
 if lower(coalesce(req.status,'')) not in ('approved','completed','paid') or req.ledger_id is null or req.reviewed_by_email is null then raise exception 'Payment has not been approved and finalized by Admin'; end if;
 credit_email:=lower(coalesce(req.sale_credit_email,'')); if credit_email='' or req.sale_credit_confirmed_by_email is null then raise exception 'Admin must confirm which employee got the sale'; end if;
 select * into led from public.payments_ledger where organization_id=oid and id=req.ledger_id;
 if not found then raise exception 'Approved ledger entry not found'; end if;
 if lower(coalesce(led.status,'')) not in ('completed','paid','settled','processed','success') or lower(coalesce(led.gateway_provider,''))<>'nmi' or coalesce(led.gateway_transaction_id,'')='' then raise exception 'Ledger is not a finalized approved NMI payment'; end if;
 select commission_rate into rate from public.app_users where organization_id=oid and lower(email)=credit_email and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if not found then raise exception 'Credited employee not found'; end if;
 earned:=round(coalesce(led.amount,led.payment_amount,0)*rate/100,2);
 insert into public.employee_commission_earnings(organization_id,ledger_id,approval_request_id,employee_email,gross_amount,commission_rate,earned_amount,status,approved_by_email,approved_at)
 values(oid,led.id,req.id,credit_email,coalesce(led.amount,led.payment_amount,0),rate,earned,'Earned',lower(req.reviewed_by_email),coalesce(req.reviewed_at,led.paid_at,led.created_at,now())) on conflict(approval_request_id) do nothing returning id into eid;
 if eid is null then select id into eid from public.employee_commission_earnings where organization_id=oid and approval_request_id=req.id; end if;
 return jsonb_build_object('ok',true,'earning_id',eid,'employee_email',credit_email,'gross_amount',coalesce(led.amount,led.payment_amount,0),'commission_rate',rate,'earned_amount',earned);
end $$;

create or replace function public.cpcm_commission_from_approved_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare led public.payments_ledger%rowtype; rate numeric; earned numeric; credit_email text; oid uuid;
begin
 oid:=new.organization_id; if oid is null then return new; end if;
 if new.ledger_id is null or new.reviewed_by_email is null or lower(coalesce(new.status,'')) not in ('approved','completed','paid') then return new; end if;
 if exists(select 1 from public.employee_commission_earnings where organization_id=oid and approval_request_id=new.id) then return new; end if;
 credit_email:=lower(coalesce(new.sale_credit_email,'')); if credit_email='' or new.sale_credit_confirmed_by_email is null or new.sale_credit_confirmed_at is null then return new; end if;
 select * into led from public.payments_ledger where organization_id=oid and id=new.ledger_id;
 if not found or lower(coalesce(led.status,'')) not in ('completed','paid','settled','processed','success') or lower(coalesce(led.gateway_provider,''))<>'nmi' or coalesce(led.gateway_transaction_id,'')='' then return new; end if;
 select commission_rate into rate from public.app_users where organization_id=oid and lower(email)=credit_email and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if rate is null then return new; end if;
 earned:=round(coalesce(led.amount,led.payment_amount,0)*rate/100,2);
 insert into public.employee_commission_earnings(organization_id,ledger_id,approval_request_id,employee_email,gross_amount,commission_rate,earned_amount,status,approved_by_email,approved_at)
 values(oid,led.id,new.id,credit_email,coalesce(led.amount,led.payment_amount,0),rate,earned,'Earned',lower(new.reviewed_by_email),coalesce(new.reviewed_at,led.paid_at,led.created_at,now())) on conflict do nothing;
 return new;
end $$;

create or replace function public.cpcm_admin_commission_staff()
returns table(email text,full_name text,role text,is_active boolean,commission_rate numeric) language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 return query select u.email,u.full_name,u.role,u.is_active,u.commission_rate from public.app_users u where u.organization_id=oid and lower(coalesce(u.role,'')) in ('admin','employee') and coalesce(u.is_active,true) order by lower(u.email);
end $$;

create or replace function public.cpcm_my_commission_summary()
returns jsonb language sql stable security invoker set search_path=public as $$
 with me as(select public.current_app_email() email,private.current_organization_id() oid),
 e as(select x.* from public.employee_commission_earnings x,me where x.organization_id=me.oid and lower(x.employee_email)=me.email and x.status='Earned'),
 rate as(select u.commission_rate from public.app_users u,me where u.organization_id=me.oid and lower(u.email)=me.email limit 1)
 select jsonb_build_object('commission_rate',coalesce((select commission_rate from rate),0),'today',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('day',now())),0),'week',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('week',now())),0),'month',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('month',now())),0),'year',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('year',now())),0),'gross_month',coalesce((select sum(gross_amount) from e where approved_at>=date_trunc('month',now())),0),'deal_count_month',(select count(*) from e where approved_at>=date_trunc('month',now())),'recent',coalesce((select jsonb_agg(jsonb_build_object('approved_at',approved_at,'gross_amount',gross_amount,'commission_rate',commission_rate,'earned_amount',earned_amount,'ledger_id',ledger_id) order by approved_at desc) from(select * from e order by approved_at desc limit 100)q),'[]'::jsonb));
$$;

revoke execute on function public.cpcm_confirm_payment_sale_credit(uuid,text) from public,anon;
revoke execute on function public.cpcm_record_approved_commission(uuid) from public,anon;
revoke execute on function public.cpcm_admin_commission_staff() from public,anon;
revoke execute on function public.cpcm_my_commission_summary() from public,anon;
grant execute on function public.cpcm_confirm_payment_sale_credit(uuid,text) to authenticated;
grant execute on function public.cpcm_record_approved_commission(uuid) to authenticated;
grant execute on function public.cpcm_admin_commission_staff() to authenticated;
grant execute on function public.cpcm_my_commission_summary() to authenticated;
revoke all on function public.cpcm_commission_from_approved_payment() from public,anon,authenticated;
commit;

-- Supplemental override: commission-rate administration.
create or replace function public.cpcm_set_employee_commission(target_email text,rate_percent numeric)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare updated_count integer; oid uuid:=private.current_organization_id();
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if rate_percent<0 or rate_percent>100 then raise exception 'Commission rate must be between 0 and 100'; end if;
 update public.app_users set commission_rate=round(rate_percent,4),updated_at=now()
 where organization_id=oid and lower(email)=lower(target_email) and lower(coalesce(role,''))='employee';
 get diagnostics updated_count=row_count; if updated_count<>1 then raise exception 'Employee not found in current organization'; end if;
 return jsonb_build_object('ok',true,'employee_email',lower(target_email),'commission_rate',round(rate_percent,4));
end $$;
revoke execute on function public.cpcm_set_employee_commission(text,numeric) from public,anon;
grant execute on function public.cpcm_set_employee_commission(text,numeric) to authenticated;
