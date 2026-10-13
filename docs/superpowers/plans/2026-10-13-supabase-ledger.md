# Pactlet Durable Supabase Ledger Implementation Plan

> **For Codex:** Execute this plan task-by-task with test-driven development. Keep SQLite as the local reference implementation and never expose Supabase credentials to browser code.

**Goal:** Make Pactlet's task authority, encrypted disposable signers, reservations, settlements, and event history durable across Vercel cold starts and safe under concurrent requests.

**Architecture:** Introduce asynchronous persistence ports used by routes and the purchase service. SQLite adapters preserve fast local tests. A server-only Supabase adapter uses explicit RPC functions for multi-row state transitions; `reserve_purchase` locks the delegation and performs idempotency, policy checks, budget calculation, reservation, and event creation inside one PostgreSQL transaction. All public-schema objects have RLS enabled and direct `anon`/`authenticated` privileges revoked; only `service_role` receives the minimum grants.

**Tech Stack:** Next.js 16.4, TypeScript 5.9, `@supabase/supabase-js` pinned exactly, PostgreSQL/Supabase RPC, Vitest, existing SQLite reference ledger.

---

## Task 1: Persistence contracts and configuration gate

**Files:**
- Create: `src/persistence/ports.ts`
- Create: `src/persistence/config.ts`
- Test: `src/persistence/config.test.ts`
- Modify: `.env.example`

1. Write failing tests proving production storage requires both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, partial configuration fails closed, and neither variable has a `NEXT_PUBLIC_` alias.
2. Define asynchronous `LedgerStore` and `TaskAccountRepository` interfaces matching every method currently used by routes and `PurchaseService`.
3. Implement a configuration parser that returns `sqlite` for explicit local/test use and `supabase` only with both valid server-only values.
4. Add empty, documented Supabase variable names to `.env.example`; do not copy values.
5. Run `pnpm vitest run src/persistence/config.test.ts` and `pnpm typecheck`.

## Task 2: PostgreSQL schema and atomic RPC contract

**Files:**
- Create through Supabase migration tooling: `supabase/migrations/<generated>_pactlet_ledger.sql`
- Create: `src/persistence/supabase/schema-contract.test.ts`

1. Write a failing static contract test requiring all nine tables, bigint money columns, state checks, foreign keys, FK indexes, idempotency uniqueness, RLS, privilege revocations, and required RPC functions.
2. Create the migration with `supabase migration new pactlet_ledger` when the CLI/MCP connection is available; do not invent a timestamp manually.
3. Define `tasks`, `task_mandates`, `task_accounts`, `delegations`, `delegation_services`, `payment_requests`, `reservations`, `settlements`, and append-only `events`. Use text application IDs and bigint identity only for event ordering.
4. Add all foreign-key indexes plus query indexes for task snapshots and active budget consumers.
5. Enable RLS on every table. Revoke table/function access from `PUBLIC`, `anon`, and `authenticated`; grant only the minimum table/sequence/function privileges to `service_role`.
6. Implement `reserve_purchase` as `SECURITY INVOKER`. Lock the selected delegation before computing allocation minus settled/pending reservations minus active children. Return the existing public result shape with decimal-string money values.
7. Implement short transactional functions for task authority initialization, cancellation, settlement pending/signature/confirmation/failure, and funded-task marking. Never call an external service from a transaction.
8. Run the schema contract test, then apply the migration to the connected Supabase project and run Supabase security/performance advisors.

## Task 3: SQLite asynchronous adapters

**Files:**
- Create: `src/persistence/sqlite-ledger-store.ts`
- Create: `src/persistence/sqlite-task-account-store.ts`
- Test: `src/persistence/sqlite-adapters.test.ts`
- Modify: `src/ledger/ledger.ts`
- Modify: `src/solana/task-accounts.ts`

1. Write failing contract tests against the asynchronous ports for task initialization, availability, duplicate purchase replay, cancellation, pending settlement, and encrypted signer reconstruction.
2. Wrap the existing synchronous SQLite classes in asynchronous adapters without changing their transaction boundaries.
3. Keep `Ledger` and `TaskAccountStore` export compatibility for existing focused unit tests.
4. Run the adapter tests and the existing ledger/signer tests.

## Task 4: Supabase task-account repository

**Files:**
- Create: `src/persistence/supabase/client.ts`
- Create: `src/persistence/supabase/task-account-store.ts`
- Test: `src/persistence/supabase/task-account-store.test.ts`

1. Pin the current compatible `@supabase/supabase-js` version and commit the lockfile.
2. Write failing tests with a fake Supabase client for creation, ownership read, encrypted signer round-trip, funding replay, conflicting funding signature, and malformed database rows.
3. Generate each disposable signer only on the server, derive its devnet USDC ATA, encrypt its 32-byte seed with the existing master key, and zero the plaintext seed.
4. Store and retrieve encrypted fields only; never serialize or log seed bytes.
5. Validate devnet network, mint, allocation, signer algorithm, and reconstructed public key on every read.
6. Run focused tests, secret scan, and typecheck.

## Task 5: Supabase ledger adapter

**Files:**
- Create: `src/persistence/supabase/ledger-store.ts`
- Create: `src/persistence/supabase/mappers.ts`
- Test: `src/persistence/supabase/ledger-store.test.ts`

1. Write failing fake-client tests proving bigint decimal-string mapping, RPC policy-code mapping, idempotent replay, unresolved settlement retention, and raw database errors are not exposed.
2. Implement authority creation and every payment transition exclusively through the migration RPCs.
3. Implement snapshot reads using bounded server-side queries ordered by event identity.
4. Map connection/RPC failures to typed storage errors so callers fail before signing when reservation durability is unavailable.
5. Run focused tests and typecheck.

## Task 6: Runtime and API integration

**Files:**
- Modify: `src/runtime/store.ts`
- Modify: `src/runtime/task-runtime.ts`
- Modify: `src/payments/purchase-service.ts`
- Modify: `src/auth/store.ts`
- Modify: `app/api/tasks/route.ts`
- Modify: `app/api/tasks/[id]/route.ts`
- Modify: `app/api/tasks/[id]/run/route.ts`
- Modify: `app/api/tasks/[id]/purchase/route.ts`
- Modify: `app/api/tasks/[id]/funding-status/route.ts`
- Modify: `app/api/tasks/[id]/funding-transaction/route.ts`
- Modify: `app/api/tasks/[id]/cancel/route.ts`
- Test: update corresponding route, runtime, and purchase-service tests

1. Change consumers to await the persistence ports.
2. Select Supabase in production when complete configuration exists; allow SQLite only in test/local explicit mode. A partial or missing production configuration returns a typed 503 and cannot reach signer creation.
3. Ensure payment flow order remains challenge validation, merchant/mint/network/payee/amount checks, durable reservation, signer access, signing, settlement verification, and durable final state.
4. Ensure a storage failure after signing returns `settlement_pending` and never releases/retries automatically.
5. Run focused routes/payment tests, full tests, and typecheck.

## Task 7: Connected Supabase concurrency and security verification

**Files:**
- Create: `src/persistence/supabase/integration.test.ts`
- Modify: `docs/security.md`
- Modify: `docs/architecture.md`

1. Gate live integration tests behind server-only test variables so ordinary local tests skip cleanly.
2. Create an isolated test task and launch two concurrent RPC reservations whose sum exceeds the delegation allocation.
3. Assert exactly one reservation succeeds, duplicate purchase references do not create a second row, and unknown settlement remains budget-consuming.
4. Verify `anon` cannot select or execute Pactlet tables/functions and service role can perform only the intended calls.
5. Run Supabase security and performance advisors and resolve actionable findings.
6. Record actual test evidence and the backend-enforced/onchain-enforced boundary.

## Task 8: Deployment readiness and documentation

**Files:**
- Modify: `src/runtime/readiness.ts`
- Modify: `src/runtime/readiness.test.ts`
- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/demo.md`
- Modify: `docs/feasibility.md`

1. Add readiness checks for storage backend and schema version without returning secret values.
2. Document Supabase project setup, migration command, Vercel encrypted variables, local SQLite fallback, and recovery limits.
3. Mark only verified capabilities complete and identify public merchant hosting plus real devnet x402 settlement as the next gate.
4. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, migration validation, and a repository secret scan.
5. Commit the durable-storage slice. Do not deploy or broadcast a devnet transaction until the configured payer, mint, base-unit amount, and recipient are shown to the user.

## Follow-up: Public merchant and real devnet settlement

After Tasks 1–8 pass, deploy `merchant/server.ts` to exactly one public Node host (Railway preferred; Render is an alternative), set `X402_MERCHANT_URL` to its HTTPS endpoint, verify the facilitator live `/supported` response for x402 V2 + `exact` + Solana devnet, then present the required transaction preview before funding or settlement. GitHub, Helius, Colosseum Copilot, and Supabase Auth are not required connections for this MVP.
