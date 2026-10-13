# Exact Devnet Funding Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark a task funded only when the submitted confirmed Solana transaction moved exactly 10,000,000 base units of devnet USDC from the connected wallet's ATA to the task ATA.

**Architecture:** A pure verifier consumes the `jsonParsed` `getTransaction` response and compares the first signature, fee payer, expected accounts, mint, decimals, and pre/post token balance deltas. The route treats a missing transaction as pending and never persists a funding signature unless every invariant passes.

**Tech Stack:** TypeScript, Solana Kit 5.5.1 RPC, `@solana-program/token` 0.9.0, Next.js 16 Route Handlers, Vitest.

## Global Constraints

- Solana devnet only; the mint is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
- Amounts are integer token base units; the required funding delta is exactly `10000000` with 6 decimals.
- A current ATA balance is not evidence that the submitted transaction funded it.
- Never mark a failed, missing, wrong-signature, wrong-payer, wrong-account, wrong-mint, wrong-decimals, or wrong-amount transaction funded.
- No transaction is signed or broadcast by this verification work.

---

### Task 1: Pure funding evidence verifier

**Files:**
- Create: `src/solana/funding-evidence.ts`
- Create: `src/solana/funding-evidence.test.ts`

**Interfaces:**
- Produces: `verifyFundingEvidence(input): boolean`
- Consumes expected `signature`, `sourceOwner`, `sourceAta`, `destinationAta`, `mint`, `amount`, and an untrusted RPC `transaction` value.

- [x] **Step 1: Write failing tests**

Create a valid `jsonParsed` fixture with the owner as first signer, exact signature, expected source/destination account indices, devnet USDC, six decimals, `-10000000` source delta, and `+10000000` destination delta. Add table-driven negative cases for failed metadata, signature mismatch, payer mismatch, non-signer payer, missing ATA, mint mismatch, decimals mismatch, source delta mismatch, and destination delta mismatch.

- [x] **Step 2: Run RED**

Run: `pnpm vitest run src/solana/funding-evidence.test.ts`

Expected: FAIL because `./funding-evidence` does not exist.

- [x] **Step 3: Implement the minimal verifier**

Validate untrusted objects without coercing fractional or unsafe numeric values. Match account keys by exact address, read base-unit strings with `BigInt`, treat a missing destination pre-balance as zero for a newly created ATA, and require exact source/destination deltas.

- [x] **Step 4: Run GREEN**

Run: `pnpm vitest run src/solana/funding-evidence.test.ts`

Expected: all funding evidence tests PASS.

### Task 2: Funding-status route integration

**Files:**
- Modify: `app/api/tasks/[id]/funding-status/route.ts`
- Modify: `docs/security.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: `verifyFundingEvidence(input): boolean`
- RPC call: `getTransaction(signature, { commitment: "confirmed", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 })`

- [x] **Step 1: Replace status-plus-balance polling**

Derive the connected wallet's devnet-USDC source ATA, fetch the submitted parsed transaction, and return HTTP 202 while it is absent. Persist the signature only when `verifyFundingEvidence` accepts it; mismatched evidence remains unconfirmed and cannot unlock purchase.

- [x] **Step 2: Update security and roadmap truthfully**

Remove the known funding-attribution limitation and document the exact signature/payer/mint/account/base-unit-delta verification. Do not claim this makes the backend trustless or production ready.

- [x] **Step 3: Run repository gates**

Run: `pnpm test && pnpm typecheck && pnpm build && git diff --check`

Expected: zero failed tests, successful typecheck/build, and no whitespace errors.

- [x] **Step 4: Commit**

```bash
git add app/api/tasks/[id]/funding-status/route.ts \
  src/solana/funding-evidence.ts src/solana/funding-evidence.test.ts \
  docs/security.md docs/roadmap.md \
  docs/superpowers/plans/2026-10-13-funding-attribution.md
git commit -m "feat: verify exact devnet task funding"
```
