# beeple M0–M1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a pinned, verified devnet/x402 foundation and the first pure TypeScript authority rules before any wallet or payment broadcast.

**Architecture:** The repository starts as one Node/Next TypeScript package. Pure policy code has no database, model, HTTP, or Solana dependency. x402 and Solana versions are pinned from an external compile/runtime spike; SQLite reservation work follows after pure rules are green.

**Tech Stack:** Node 22, pnpm 12.4.1, TypeScript 5.9.3, Vitest 5.0.4, x402 2.28.0, Solana Kit 5.5.1, SQLite via better-sqlite3 13.0.3.

## Global Constraints

- Devnet only: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`.
- Devnet USDC only: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
- All money values are integer token base units represented as `bigint` in policy code and decimal strings at persistence/API boundaries.
- Children may narrow but never widen parent budget, service set, or expiry.
- `beeple` is a placeholder; do not use AgentPass as the new name.
- No mainnet, real funds, deploy, PR, or Colosseum submission.

---

### Task 1: Pin and verify the toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `pnpm-lock.yaml`
- Create: `docs/feasibility.md`

**Interfaces:**
- Consumes: npm registry metadata, official Solana/x402 docs, live facilitator `/supported`.
- Produces: warning-free pinned dependency graph and reproducible `pnpm install --frozen-lockfile`.

- [x] Record the rejected Kit 8.4.0 peer mismatch and accepted Kit 5.5.1 graph.
- [x] Run `pnpm install --frozen-lockfile` and retain the generated lockfile.
- [x] Run `pnpm typecheck`; expected exit code 0 after policy files exist.

### Task 2: Write the delegation contract as failing tests

**Files:**
- Create: `src/policy/delegation.test.ts`
- Create: `src/policy/types.ts`

**Interfaces:**
- Consumes: `DelegationAuthority` with `allocation`, `available`, `expiresAt`, `services`, and `status`.
- Produces: desired `validateChildDelegation(parent, proposal, now)` behavior and stable rejection codes.

- [x] Add a test where child service `analysis-api` is absent from the parent set and expect `SERVICE_NOT_ALLOWED`.
- [x] Run `pnpm test src/policy/delegation.test.ts`; expected failure because `validateChildDelegation` does not exist.
- [x] Add budget, expiry, cancellation, and happy-path tests one at a time, verifying each new rejection fails for the intended missing behavior.

### Task 3: Implement minimal pure delegation validation

**Files:**
- Create: `src/policy/delegation.ts`
- Modify: `src/policy/delegation.test.ts`

**Interfaces:**
- Consumes: `DelegationAuthority`, `ChildDelegationProposal`, and a caller-supplied epoch-millisecond `now`.
- Produces: `PolicyDecision` with `{ ok: true }` or `{ ok: false, code, message }`.

- [x] Implement status/expiry rejection before evaluating the proposal.
- [x] Implement positive integer allocation and `allocation <= parent.available`.
- [x] Implement child expiry not later than parent expiry and later than `now`.
- [x] Implement service subset validation with no empty or duplicate identifiers.
- [x] Run the focused tests; expected all delegation tests pass.
- [x] Run `pnpm test` and `pnpm typecheck`; expected exit code 0.

### Task 4: Advance milestone evidence

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: actual command output from install, tests, and typecheck.
- Produces: truthful M0 status and explicit M1 partial-progress statement.

- [x] Mark M0 complete only if lockfile install, facilitator check, mint/ATA checks, spike, tests, and typecheck all pass.
- [x] Record M1 as in progress; do not claim SQLite concurrency or idempotency before those tests exist.

### Task 5: Validate x402 payment terms before reservation

**Files:**
- Create: `src/policy/payment-terms.test.ts`
- Create: `src/policy/payment-terms.ts`

**Interfaces:**
- Consumes: an x402 V2 payment requirement plus the server-owned expected service, payee, and maximum base-unit amount.
- Produces: a parsed integer amount or a stable rejection code before any signer or ledger call is reachable.

- [x] Reject the wrong x402 version, scheme, network, mint, recipient, service, malformed amount, and over-budget amount in focused tests.
- [x] Accept only V2 `exact` terms for the pinned Solana devnet network and devnet USDC mint.
- [x] Run the focused tests and typecheck.

### Task 6: Reserve and settle budget atomically in SQLite

**Files:**
- Create: `src/ledger/ledger.test.ts`
- Create: `src/ledger/ledger.ts`

**Interfaces:**
- Consumes: server-authenticated delegation context, purchase key, service identifier, integer amount, and caller-supplied time.
- Produces: an idempotent payment request plus reservation/settlement/event records, or a rejection without reserving funds.

- [x] Create separate task, delegation, service, payment-request, reservation, settlement, and event tables.
- [x] Compute available amount as allocation minus non-released reservations and active child allocations.
- [x] Reserve inside one immediate SQLite transaction and enforce one request per delegation/purchase key.
- [x] Test duplicate purchase keys and two competing reservations that cannot together exceed the allocation.
- [x] Test cancellation/expiry, definite failure release, uncertain settlement retention, and confirmed signature persistence.
- [x] Run the focused tests, full suite, and typecheck before advancing M1 evidence.
