# Product App Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a real `/app` devnet workflow backed by Solana's current Kit wallet plugin and move the deterministic walkthrough to `/demo`.

**Architecture:** Keep route shells as Next.js Server Components and wallet behavior in a Client Component. Isolate Kit 8 wallet dependencies in `@pactlet/wallet-kit` while the proven x402/funding graph stays on Kit 5. The wallet client is permanently bound to `solana:devnet`.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 5.9, Solana Kit 5/8 isolated workspaces, `@solana/kit-plugin-wallet`, `@solana/react`, Wallet Standard, Vitest.

## Global Constraints

- Devnet only; never expose a network switcher or accept mainnet identifiers.
- `/app` is live-only and `/demo` is simulation-only.
- The browser wallet signs authentication and task funding only; agents never receive keys.
- Preserve the verified x402 2.28.0 V2 exact integration.
- Show payer, mint, base-unit amount, and recipient before funding approval.
- Do not claim a payment without a confirmed Explorer signature.

---

### Task 1: Prove the Kit wallet plugin dependency set

**Files:** `packages/wallet-kit/**`, `scripts/spike/wallet-plugin-compatibility.ts`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `docs/feasibility.md`

- [x] Write and run a failing wallet plugin compatibility spike.
- [x] Reject the peer-incompatible single-root Kit 8 graph.
- [x] Isolate Kit 8.5.0, wallet plugin 0.21.0, and React bindings 8.5.0 in a browser workspace package while retaining Kit 5.5.1 for x402.
- [x] Run peer check, spike, strict typecheck, and focused Solana/x402 tests.
- [x] Record and commit the proven dependency slice.

### Task 2: Separate product and demo routes

**Files:** `app/demo/page.tsx`, `app/app/page.tsx`, `app/components/public-demo.tsx`, `app/page.tsx`, `src/demo/public-demo-ui.test.tsx`

- [x] Write failing tests asserting `/app` is live-only and `/demo` is simulation-only.
- [x] Run the focused test and observe the expected failure.
- [x] Add `/demo`, render `WalletConnect` directly from `/app`, remove `DemoModes`, and add distinct landing links.
- [x] Run the focused test and commit the route split.

### Task 3: Integrate Kit wallet plugin UX

**Files:** `app/solana-provider.tsx`, `src/solana/wallet-ui-state.ts`, `src/solana/wallet-ui-state.test.ts`, `app/layout.tsx`, `app/wallet-connect.tsx`, `app/globals.css`

- [ ] Write failing state tests for detected wallets, missing desktop extension, and mobile recovery.
- [ ] Add the Kit 8 provider and migrate connect, reconnect, disconnect, message signing, and funding send behavior.
- [ ] Add “Open in Phantom”, “Install a wallet”, and “Try guided demo” recovery actions.
- [ ] Preserve nonce verification and pre-signing payer/mint/amount/recipient preview.
- [ ] Run focused wallet/auth/funding tests, typecheck, and commit.

### Task 4: Product-safe failures and final verification

**Files:** `app/app/error.tsx`, `README.md`, `docs/demo.md`, `docs/roadmap.md`

- [ ] Add a safe application error boundary with retry and `/demo` escape.
- [ ] Document route separation, supported wallet environments, devnet limits, and unconfirmed payment boundary.
- [ ] Run full tests, typecheck, build, claim scan, and local route smoke checks.
- [ ] Commit verified work. Deploy only after a separate deployment decision.

## Self-review

The tasks cover dependency isolation, route separation, current Kit wallet integration, recovery UX, devnet binding, funding preview, safe failures, and final documentation. No mainnet or live-payment claim is introduced.
