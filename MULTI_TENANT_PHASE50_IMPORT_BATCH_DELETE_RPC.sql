-- Phase 50: remove browser bulk DELETE dependency for mistaken import batches.
begin;
create or replace function public.cpcm_admin_delete_import_batch_accounts(p_account_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); requested_count int; matched_count int; deleted_count int;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 requested_count:=coalesce(array_length(p_account_ids,1),0);
 if requested_count=0 then raise exception 'account ids required'; end if;
 if requested_count>5000 then raise exception 'too many accounts in one delete request'; end if;
 select count(*) into matched_count from public.accounts a where a.organization_id=oid and a.id=any(p_account_ids);
 if matched_count<>requested_count then raise exception 'delete set contains missing or non-tenant accounts'; end if;
 delete from public.accounts a where a.organization_id=oid and a.id=any(p_account_ids);
 get diagnostics deleted_count=row_count;
 if deleted_count<>requested_count then raise exception 'delete verification failed'; end if;
 return jsonb_build_object('ok',true,'deleted_count',deleted_count);
end $$;
revoke all on function public.cpcm_admin_delete_import_batch_accounts(uuid[]) from public,anon;
grant execute on function public.cpcm_admin_delete_import_batch_accounts(uuid[]) to authenticated;
commit;
