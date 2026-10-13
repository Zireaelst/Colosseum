# Pactlet Supabase Ledger Design

**Date:** 2026-10-13
**Status:** Approved

## Goal

Replace process-local production state with a durable Supabase Postgres ledger
that preserves Pactlet's atomic budgets, idempotency, encrypted task signers,
and backend-only authorization across Vercel cold starts and concurrent
instances.

This pass covers durable backend state. Public merchant hosting and the first
real devnet settlement are separate follow-up gates.

## Chosen architecture

The public Next.js deployment uses Supabase's HTTPS Data API from server-only
code. Runtime configuration consists of `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; neither value is exposed through a `NEXT_PUBLIC_`
variable or returned by an API. A database connection URL is optional for local
migration tooling and is never used by browser code.

Critical state changes run as Postgres database functions. In particular,
`reserve_purchase` performs the idempotency lookup, authority/resource checks,
availability calculation, row locking, payment-request insert, reservation
insert, and event insert in one database transaction. The application must not
split those operations into independent Data API calls.

SQLite remains the local unit-test/reference implementation. Production code
selects the Supabase adapter only when all required server-only configuration is
valid. Missing or partial production configuration fails the live APIs closed;
the explicitly simulated public walkthrough remains available.

## Data model

Postgres stores the same separated concepts as the SQLite ledger:

- `tasks` and `task_mandates`;
- `task_accounts`, including only AES-256-GCM encrypted signer material;
- `delegations` and `delegation_services`;
- `payment_requests` and `reservations`;
- `settlements` and append-only `events`.

Money columns use `bigint` and cross the JSON boundary as decimal strings.
Transaction signatures, `(delegation_id, purchase_ref)`, and task IDs retain
unique constraints. Foreign keys and state checks remain in the database.

The schema denies direct `anon` and `authenticated` access. Only Pactlet's
server-side service role calls the adapter. Solana wallet authentication remains
Pactlet's existing signed challenge/session mechanism; Supabase Auth is not
introduced.

## Runtime interfaces

Introduce asynchronous ports for the two persistence responsibilities:

- `LedgerStore`: task/delegation creation, atomic reservation, settlement
  transitions, cancellation, snapshot reads, and reconciliation reads.
- `TaskAccountStore`: encrypted task-account creation, signer reconstruction,
  ownership reads, and funding-signature persistence.

The existing SQLite classes implement the same asynchronous contracts through
small adapters. API routes and `PurchaseService` await the ports without knowing
which storage provider is active.

## Concurrency and idempotency

`reserve_purchase` locks the selected delegation and reads all budget-consuming
reservations plus active child allocations inside the same transaction. The
unique purchase reference resolves exact retries to the original result.
Different service, resource, or amount under the same reference returns
`IDEMPOTENCY_CONFLICT` and records a rejection event without modifying the
original payment.

Settlement timeout behavior remains unchanged: an unknown result stays pending
and keeps its reservation. Only a definite failure releases the reservation.

## Configuration and account access

The user creates or connects one Supabase project and stores the following
values directly in ignored local environment files and encrypted Vercel project
settings:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

No secret is pasted into chat, committed, printed, or placed in a client-side
variable. Schema migration can be applied through an authenticated Supabase CLI
browser flow or the Supabase SQL Editor. Pactlet never asks for the database
password or service-role key in chat.

## Error handling

- Missing configuration returns a capability-specific 503 response.
- Network or Supabase timeout before a payment reservation returns a safe
  failure and cannot reach the signer.
- A timeout after signing remains `settlement_pending`; database connectivity
  failure must never cause an automatic second signing attempt.
- Constraint and RPC policy codes are mapped to the existing public rejection
  codes without exposing raw database errors.
- Migration version mismatch fails readiness and disables live task creation.

## Test gates

- Contract tests run the same authority/idempotency scenarios against the
  SQLite adapter and the Supabase adapter when test credentials are present.
- Unit tests verify configuration, bigint serialization, error mapping, and
  that routes fail closed without production storage.
- A Supabase integration test creates two competing reservations and proves
  they cannot jointly exceed one delegation.
- Existing payment, signer, authentication, funding, and UI tests remain green.
- `pnpm test`, `pnpm typecheck`, `pnpm build`, migration validation, and secret
  scans pass before any deployment.

## Deferred follow-up

After durable storage passes its gates, deploy the existing Express merchant to
a public HTTPS Node host such as Railway or Render. Verify its `/supported`
startup gate and 402 challenge from the deployed Next.js backend. Deployment,
devnet funding, and the first real x402 settlement remain explicitly previewed
external actions.
