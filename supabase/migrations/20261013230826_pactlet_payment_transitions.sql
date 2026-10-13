create or replace function public.available_amount(
  p_delegation_id text,
  p_now_ms bigint
) returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive inactive_descendants(id) as (
    select c.id from public.delegations c
    where c.parent_id = p_delegation_id
      and (c.status <> 'active' or c.expires_at_ms <= p_now_ms)
    union all
    select c.id from public.delegations c
    join inactive_descendants p on c.parent_id = p.id
  )
  select d.allocation_units
    - coalesce((select sum(r.amount_units) from public.reservations r
      where r.delegation_id = d.id and r.state in ('pending', 'settled')), 0)
    - coalesce((select sum(c.allocation_units) from public.delegations c
      where c.parent_id = d.id and c.status = 'active'
        and c.expires_at_ms > p_now_ms), 0)
    - coalesce((select sum(r.amount_units) from public.reservations r
      join inactive_descendants x on x.id = r.delegation_id
      where r.state in ('pending', 'settled')), 0)
  from public.delegations d where d.id = p_delegation_id;
$$;

create or replace function public.cancel_delegation(
  p_delegation_id text,
  p_now_ms bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_task_id text;
begin
  update public.delegations
  set status = 'cancelled'
  where id = p_delegation_id and status = 'active'
  returning task_id into v_task_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'UNKNOWN_OR_INACTIVE_DELEGATION';
  end if;
  insert into public.events (
    task_id, delegation_id, event_type, details, created_at_ms
  ) values (v_task_id, p_delegation_id, 'delegation_cancelled', '{}'::jsonb, p_now_ms);
end;
$$;

create or replace function public.mark_settlement_pending(
  p_payment_request_id text,
  p_now_ms bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_task_id text; v_delegation_id text;
begin
  update public.payment_requests p
  set state = 'settlement_pending', updated_at_ms = p_now_ms
  from public.delegations d
  where p.id = p_payment_request_id and p.state = 'reserved'
    and d.id = p.delegation_id
  returning d.task_id, p.delegation_id into v_task_id, v_delegation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_RESERVED';
  end if;
  insert into public.events (
    task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
  ) values (
    v_task_id, v_delegation_id, p_payment_request_id,
    'settlement_pending', '{}'::jsonb, p_now_ms
  );
end;
$$;

create or replace function public.record_pending_signature(
  p_payment_request_id text,
  p_transaction_signature text,
  p_now_ms bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.payment_requests
  set pending_transaction_signature = p_transaction_signature,
      updated_at_ms = p_now_ms
  where id = p_payment_request_id and state = 'settlement_pending'
    and (pending_transaction_signature is null
      or pending_transaction_signature = p_transaction_signature);
  if not found then
    raise exception using errcode = 'P0002', message = 'SIGNATURE_CONFLICT';
  end if;
end;
$$;

create or replace function public.fail_payment(
  p_payment_request_id text,
  p_failure_code text,
  p_now_ms bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_task_id text; v_delegation_id text;
begin
  update public.payment_requests p
  set state = 'failed', rejection_code = 'SETTLEMENT_FAILED', updated_at_ms = p_now_ms
  from public.delegations d
  where p.id = p_payment_request_id
    and p.state in ('reserved', 'settlement_pending')
    and d.id = p.delegation_id
  returning d.task_id, p.delegation_id into v_task_id, v_delegation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FAILABLE';
  end if;
  update public.reservations set state = 'released', updated_at_ms = p_now_ms
    where payment_request_id = p_payment_request_id and state = 'pending';
  insert into public.settlements (
    id, payment_request_id, state, failure_code, created_at_ms
  ) values (gen_random_uuid()::text, p_payment_request_id, 'failed', p_failure_code, p_now_ms);
  insert into public.events (
    task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
  ) values (
    v_task_id, v_delegation_id, p_payment_request_id, 'payment_failed',
    jsonb_build_object('failureCode', p_failure_code), p_now_ms
  );
end;
$$;

create or replace function public.confirm_settlement(
  p_payment_request_id text,
  p_transaction_signature text,
  p_now_ms bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_task_id text; v_delegation_id text;
begin
  update public.payment_requests p
  set state = 'settled', updated_at_ms = p_now_ms
  from public.delegations d
  where p.id = p_payment_request_id and p.state = 'settlement_pending'
    and d.id = p.delegation_id
  returning d.task_id, p.delegation_id into v_task_id, v_delegation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_PENDING';
  end if;
  update public.reservations set state = 'settled', updated_at_ms = p_now_ms
    where payment_request_id = p_payment_request_id and state = 'pending';
  insert into public.settlements (
    id, payment_request_id, state, transaction_signature, created_at_ms
  ) values (
    gen_random_uuid()::text, p_payment_request_id, 'confirmed',
    p_transaction_signature, p_now_ms
  );
  insert into public.events (
    task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
  ) values (
    v_task_id, v_delegation_id, p_payment_request_id, 'payment_settled',
    jsonb_build_object('transactionSignature', p_transaction_signature), p_now_ms
  );
end;
$$;

revoke all on function public.available_amount(text, bigint) from public, anon, authenticated;
revoke all on function public.cancel_delegation(text, bigint) from public, anon, authenticated;
revoke all on function public.mark_settlement_pending(text, bigint) from public, anon, authenticated;
revoke all on function public.record_pending_signature(text, text, bigint) from public, anon, authenticated;
revoke all on function public.fail_payment(text, text, bigint) from public, anon, authenticated;
revoke all on function public.confirm_settlement(text, text, bigint) from public, anon, authenticated;

grant execute on function public.available_amount(text, bigint) to service_role;
grant execute on function public.cancel_delegation(text, bigint) to service_role;
grant execute on function public.mark_settlement_pending(text, bigint) to service_role;
grant execute on function public.record_pending_signature(text, text, bigint) to service_role;
grant execute on function public.fail_payment(text, text, bigint) to service_role;
grant execute on function public.confirm_settlement(text, text, bigint) to service_role;
