# Structured Task Mandate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and enforce a task purpose, configured resource, per-purchase cap, expiry, and explicit purchase reference before any x402 signing.

**Architecture:** Store one immutable mandate row per task and bind payment requests to a resource ID plus purchase reference. Keep resource selection in server runtime context, perform every policy check inside the existing immediate SQLite reservation transaction, and expose only display-safe mandate data through the authenticated snapshot.

**Tech Stack:** TypeScript 5.9, Next.js 16 Route Handlers, SQLite via better-sqlite3, zod 4, x402 2.28, Vitest 5.

## Global Constraints

- Solana devnet only; no mainnet or real-value funds.
- The configured MVP service/resource pair is `research-api` / `research-brief`.
- All amounts are integer token base units.
- Agent identity, service, resource, merchant URL, amount, and signer remain server-bound.
- Jev performs routing only and never makes a policy or payment decision.
- A rejection must occur before signer loading or transport payment.
- Existing SQLite databases must migrate without deleting user data.

---

### Task 1: Atomic mandate enforcement

**Files:**
- Modify: `src/ledger/ledger.ts`
- Test: `src/ledger/ledger.test.ts`

**Interfaces:**
- Extend `CreateTaskInput` with `mandate`.
- Rename the public idempotency field to `purchaseRef` and add `resourceId`.
- Add `RESOURCE_NOT_ALLOWED`, `PURCHASE_LIMIT_EXCEEDED`, and `IDEMPOTENCY_CONFLICT` rejection codes.

- [ ] Add focused failing tests for wrong resource, per-purchase overflow, identical replay, and conflicting replay.
- [ ] Run `pnpm vitest run src/ledger/ledger.test.ts` and verify the new assertions fail for missing mandate behavior.
- [ ] Add the `task_mandates` table, migrate `payment_requests.resource_id`, and enforce the checks inside `reservePurchase`.
- [ ] Return mandate/resource/reference fields from `taskSnapshot`.
- [ ] Re-run the focused ledger tests and verify they pass.

### Task 2: Bind x402 purchase to the configured resource

**Files:**
- Modify: `src/payments/purchase-service.ts`
- Modify: `src/payments/purchase-service.test.ts`
- Modify: `src/runtime/task-runtime.ts`
- Modify: `src/runtime/task-runtime.test.ts`

**Interfaces:**
- `MerchantService` includes `resourceId: "research-brief"`.
- `PurchaseInput` includes server-bound `resourceId` and `purchaseRef`.

- [ ] Add a failing purchase-service test proving wrong-resource rejection never calls `pay` or signer loading.
- [ ] Run the focused test and verify RED.
- [ ] Pass the configured resource into atomic reservation and initialize the task mandate from validated creation input.
- [ ] Run purchase/runtime tests and verify GREEN.

### Task 3: Task creation API and simple dashboard

**Files:**
- Create: `src/runtime/task-mandate.ts`
- Create: `src/runtime/task-mandate.test.ts`
- Modify: `app/api/tasks/route.ts`
- Modify: `app/api/tasks/[id]/purchase/route.ts`
- Modify: `app/api/tasks/[id]/run/route.ts`
- Modify: `app/api/tasks/[id]/route.ts`
- Modify: `app/wallet-connect.tsx`
- Modify: `app/components/task-dashboard.tsx`
- Modify: `src/ui/task-view-model.ts`
- Modify: `src/ui/task-view-model.test.ts`

**Interfaces:**
- `taskMandateSchema` accepts purpose, literal service/resource IDs, decimal base-unit cap, and duration minutes.
- The dashboard renders the persisted mandate and payment reference.

- [ ] Add failing schema/view-model tests for safe inputs and display fields.
- [ ] Run focused tests and verify RED.
- [ ] Validate task creation input, send safe UI defaults, and expose the stored mandate in snapshots.
- [ ] Replace client-generated `purchaseKey` with explicit `purchaseRef` while keeping identity and resource server-owned.
- [ ] Run focused tests and verify GREEN.

### Task 4: Documentation and repository gates

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/security.md`
- Modify: `docs/roadmap.md`
- Modify: `README.md`

- [ ] Document the mandate enforcement path and backend-only trust boundary.
- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
- [ ] Scan tracked files for secret assignments and prohibited former product names.
- [ ] Commit the tested feature without pushing or deploying.
