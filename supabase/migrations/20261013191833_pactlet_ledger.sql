create extension if not exists pgcrypto;

create table public.tasks (
  id text primary key,
  owner_wallet text not null,
  allocation_units bigint not null check (allocation_units > 0),
  expires_at_ms bigint not null,
  status text not null default 'active' check (status in ('active', 'cancelled'))
);

create table public.task_mandates (
  task_id text primary key references public.tasks(id) on delete cascade,
  purpose text not null,
  service_id text not null,
  resource_id text not null,
  max_amount_units bigint not null check (max_amount_units > 0)
);

create table public.task_accounts (
  id text primary key,
  owner_wallet text not null,
  network text not null,
  mint text not null,
  allocation_units bigint not null check (allocation_units > 0),
  payment_address text not null unique,
  payment_ata text not null unique,
  funding_signature text unique,
  signer_algorithm text not null check (signer_algorithm = 'aes-256-gcm'),
  signer_iv text not null,
  signer_ciphertext text not null,
  signer_authentication_tag text not null,
  created_at_ms bigint not null
);

create table public.delegations (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  parent_id text references public.delegations(id),
  allocation_units bigint not null check (allocation_units > 0),
  expires_at_ms bigint not null,
  status text not null default 'active' check (status in ('active', 'cancelled'))
);

create table public.delegation_services (
  delegation_id text not null references public.delegations(id) on delete cascade,
  service_id text not null,
  primary key (delegation_id, service_id)
);

create table public.payment_requests (
  id text primary key,
  delegation_id text not null references public.delegations(id),
  purchase_ref text not null,
  service_id text not null,
  resource_id text not null,
  amount_units bigint not null,
  state text not null check (
    state in ('reserved', 'settlement_pending', 'settled', 'failed', 'rejected')
  ),
  rejection_code text,
  pending_transaction_signature text unique,
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  unique (delegation_id, purchase_ref)
);

create table public.reservations (
  payment_request_id text primary key references public.payment_requests(id),
  delegation_id text not null references public.delegations(id),
  amount_units bigint not null check (amount_units > 0),
  state text not null check (state in ('pending', 'settled', 'released')),
  created_at_ms bigint not null,
  updated_at_ms bigint not null
);

create table public.settlements (
  id text primary key,
  payment_request_id text not null unique references public.payment_requests(id),
  state text not null check (state in ('confirmed', 'failed')),
  transaction_signature text unique,
  failure_code text,
  created_at_ms bigint not null
);

create table public.events (
  id bigint generated always as identity primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  delegation_id text references public.delegations(id),
  payment_request_id text references public.payment_requests(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at_ms bigint not null
);

create index delegations_task_id_idx on public.delegations(task_id);
create index delegations_parent_id_idx on public.delegations(parent_id);
create index payment_requests_delegation_id_idx on public.payment_requests(delegation_id);
create index reservations_delegation_id_idx on public.reservations(delegation_id);
create index settlements_payment_request_id_idx on public.settlements(payment_request_id);
create index events_task_id_idx on public.events(task_id, id desc);
create index events_delegation_id_idx on public.events(delegation_id);
create index events_payment_request_id_idx on public.events(payment_request_id);
create index reservations_budget_consumers_idx
  on public.reservations(delegation_id, state)
  where state in ('pending', 'settled');

create or replace function public.initialize_task_authority(
  p_task_id text,
  p_owner_wallet text,
  p_allocation_units bigint,
  p_expires_at_ms bigint,
  p_purpose text,
  p_service_id text,
  p_resource_id text,
  p_max_amount_units bigint,
  p_manager_id text,
  p_research_id text,
  p_analysis_id text,
  p_specialist_expires_at_ms bigint,
  p_research_allocation_units bigint,
  p_analysis_allocation_units bigint
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_allocation_units <= 0
    or p_max_amount_units <= 0
    or p_research_allocation_units + p_analysis_allocation_units > p_allocation_units
    or p_specialist_expires_at_ms > p_expires_at_ms then
    raise exception using errcode = '22023', message = 'INVALID_TASK_AUTHORITY';
  end if;

  insert into public.tasks (
    id, owner_wallet, allocation_units, expires_at_ms, status
  ) values (
    p_task_id, p_owner_wallet, p_allocation_units, p_expires_at_ms, 'active'
  );
  insert into public.task_mandates (
    task_id, purpose, service_id, resource_id, max_amount_units
  ) values (
    p_task_id, p_purpose, p_service_id, p_resource_id, p_max_amount_units
  );
  insert into public.delegations (
    id, task_id, parent_id, allocation_units, expires_at_ms, status
  ) values
    (p_manager_id, p_task_id, null, p_allocation_units, p_expires_at_ms, 'active'),
    (p_research_id, p_task_id, p_manager_id, p_research_allocation_units,
      p_specialist_expires_at_ms, 'active'),
    (p_analysis_id, p_task_id, p_manager_id, p_analysis_allocation_units,
      p_specialist_expires_at_ms, 'active');
  insert into public.delegation_services (delegation_id, service_id) values
    (p_manager_id, 'research-api'),
    (p_manager_id, 'analysis-api'),
    (p_research_id, 'research-api'),
    (p_analysis_id, 'analysis-api');
  insert into public.events (task_id, event_type, details, created_at_ms)
    values (p_task_id, 'task_created', '{}'::jsonb, p_expires_at_ms);
end;
$$;

create or replace function public.reserve_purchase(
  p_delegation_id text,
  p_purchase_ref text,
  p_service_id text,
  p_resource_id text,
  p_amount_units bigint,
  p_now_ms bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delegation public.delegations%rowtype;
  v_existing public.payment_requests%rowtype;
  v_existing_found boolean := false;
  v_mandate public.task_mandates%rowtype;
  v_payment_id text := gen_random_uuid()::text;
  v_available bigint;
  v_code text;
begin
  select * into v_delegation
  from public.delegations
  where id = p_delegation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'UNKNOWN_DELEGATION';
  end if;

  select * into v_existing
  from public.payment_requests
  where delegation_id = p_delegation_id and purchase_ref = p_purchase_ref;
  v_existing_found := found;

  with recursive inactive_descendants(id) as (
    select c.id from public.delegations c
    where c.parent_id = p_delegation_id
      and (c.status <> 'active' or c.expires_at_ms <= p_now_ms)
    union all
    select c.id from public.delegations c
    join inactive_descendants p on c.parent_id = p.id
  )
  select v_delegation.allocation_units
    - coalesce((select sum(r.amount_units) from public.reservations r
      where r.delegation_id = p_delegation_id
        and r.state in ('pending', 'settled')), 0)
    - coalesce((select sum(c.allocation_units) from public.delegations c
      where c.parent_id = p_delegation_id and c.status = 'active'
        and c.expires_at_ms > p_now_ms), 0)
    - coalesce((select sum(r.amount_units) from public.reservations r
      join inactive_descendants x on x.id = r.delegation_id
      where r.state in ('pending', 'settled')), 0)
  into v_available;

  if v_existing_found then
    if v_existing.service_id <> p_service_id
      or v_existing.resource_id <> p_resource_id
      or v_existing.amount_units <> p_amount_units then
      insert into public.events (
        task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
      ) values (
        v_delegation.task_id, p_delegation_id, v_existing.id,
        'payment_rejected', jsonb_build_object('code', 'IDEMPOTENCY_CONFLICT'), p_now_ms
      );
      return jsonb_build_object(
        'ok', false, 'paymentRequestId', v_existing.id, 'replayed', true,
        'state', 'rejected', 'code', 'IDEMPOTENCY_CONFLICT',
        'amount', p_amount_units::text, 'availableAfter', v_available::text
      );
    end if;
    return jsonb_build_object(
      'ok', v_existing.state not in ('failed', 'rejected'),
      'paymentRequestId', v_existing.id, 'replayed', true,
      'state', v_existing.state,
      'code', v_existing.rejection_code,
      'amount', v_existing.amount_units::text,
      'availableAfter', v_available::text
    );
  end if;

  select * into v_mandate from public.task_mandates
    where task_id = v_delegation.task_id;

  if p_amount_units <= 0 then v_code := 'INVALID_AMOUNT';
  elsif v_delegation.status <> 'active' then v_code := 'AUTHORITY_CANCELLED';
  elsif v_delegation.expires_at_ms <= p_now_ms then v_code := 'AUTHORITY_EXPIRED';
  elsif not exists (
    select 1 from public.delegation_services
    where delegation_id = p_delegation_id and service_id = p_service_id
  ) then v_code := 'SERVICE_NOT_ALLOWED';
  elsif v_mandate.service_id <> p_service_id then v_code := 'SERVICE_NOT_ALLOWED';
  elsif v_mandate.resource_id <> p_resource_id then v_code := 'RESOURCE_NOT_ALLOWED';
  elsif p_amount_units > v_mandate.max_amount_units then v_code := 'PURCHASE_LIMIT_EXCEEDED';
  elsif p_amount_units > v_available then v_code := 'BUDGET_EXCEEDED';
  end if;

  if v_code is not null then
    insert into public.payment_requests (
      id, delegation_id, purchase_ref, service_id, resource_id, amount_units,
      state, rejection_code, created_at_ms, updated_at_ms
    ) values (
      v_payment_id, p_delegation_id, p_purchase_ref, p_service_id, p_resource_id,
      p_amount_units, 'rejected', v_code, p_now_ms, p_now_ms
    );
    insert into public.events (
      task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
    ) values (
      v_delegation.task_id, p_delegation_id, v_payment_id, 'payment_rejected',
      jsonb_build_object('code', v_code), p_now_ms
    );
    return jsonb_build_object(
      'ok', false, 'paymentRequestId', v_payment_id, 'replayed', false,
      'state', 'rejected', 'code', v_code, 'amount', p_amount_units::text,
      'availableAfter', v_available::text
    );
  end if;

  insert into public.payment_requests (
    id, delegation_id, purchase_ref, service_id, resource_id, amount_units,
    state, created_at_ms, updated_at_ms
  ) values (
    v_payment_id, p_delegation_id, p_purchase_ref, p_service_id, p_resource_id,
    p_amount_units, 'reserved', p_now_ms, p_now_ms
  );
  insert into public.reservations (
    payment_request_id, delegation_id, amount_units, state, created_at_ms, updated_at_ms
  ) values (
    v_payment_id, p_delegation_id, p_amount_units, 'pending', p_now_ms, p_now_ms
  );
  insert into public.events (
    task_id, delegation_id, payment_request_id, event_type, details, created_at_ms
  ) values (
    v_delegation.task_id, p_delegation_id, v_payment_id, 'payment_reserved',
    jsonb_build_object('amount', p_amount_units::text), p_now_ms
  );
  return jsonb_build_object(
    'ok', true, 'paymentRequestId', v_payment_id, 'replayed', false,
    'state', 'reserved', 'amount', p_amount_units::text,
    'availableAfter', (v_available - p_amount_units)::text
  );
end;
$$;

create or replace function public.mark_task_funded(
  p_task_id text,
  p_funding_signature text
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  update public.task_accounts
  set funding_signature = p_funding_signature
  where id = p_task_id
    and (funding_signature is null or funding_signature = p_funding_signature)
  returning true;
$$;

alter table public.tasks enable row level security;
alter table public.task_mandates enable row level security;
alter table public.task_accounts enable row level security;
alter table public.delegations enable row level security;
alter table public.delegation_services enable row level security;
alter table public.payment_requests enable row level security;
alter table public.reservations enable row level security;
alter table public.settlements enable row level security;
alter table public.events enable row level security;

revoke all on public.tasks, public.task_mandates, public.task_accounts,
  public.delegations, public.delegation_services, public.payment_requests,
  public.reservations, public.settlements, public.events
from public, anon, authenticated;
revoke all on sequence public.events_id_seq from public, anon, authenticated;
revoke all on function public.initialize_task_authority(
  text, text, bigint, bigint, text, text, text, bigint, text, text, text,
  bigint, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.reserve_purchase(
  text, text, text, text, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.mark_task_funded(text, text)
  from public, anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update on
  public.tasks, public.task_mandates, public.task_accounts,
  public.delegations, public.delegation_services, public.payment_requests,
  public.reservations, public.settlements, public.events
to service_role;
grant usage, select on sequence public.events_id_seq to service_role;
grant execute on function public.initialize_task_authority(
  text, text, bigint, bigint, text, text, text, bigint, text, text, text,
  bigint, bigint, bigint
) to service_role;
grant execute on function public.reserve_purchase(
  text, text, text, text, bigint, bigint
) to service_role;
grant execute on function public.mark_task_funded(text, text) to service_role;
