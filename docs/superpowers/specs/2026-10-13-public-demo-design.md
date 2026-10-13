# Pactlet Public Demo Design

**Date:** 2026-10-13  
**Status:** Approved

## Goal

Make the deployed Pactlet site reliably demonstrable by any judge without a
wallet, local merchant process, or persistent server session, while preserving
the existing wallet-backed devnet path for local development. The public demo
must never present simulated activity as a real Solana transaction.

## Current failure boundary

The local application assumes one long-running Node.js process:

- SQLite writes to `./pactlet.db`.
- Wallet nonces, sessions, task accounts, and signer instances live in memory.
- The merchant URL points to `http://127.0.0.1:4021/research`.

Those assumptions do not hold across separate, ephemeral Vercel functions.
`NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000` and
`PACTLET_DATABASE_PATH=./pactlet.db` remain correct local defaults; production
configuration must override the browser origin and must not pretend that a
relative SQLite file provides durable serverless storage.

## Chosen approach

The `/app` page will expose two clearly separated modes:

1. **Public Demo** is the default on Vercel. It runs deterministically in the
   browser and needs no wallet or backend state. It demonstrates a 10 test-USDC
   task, 4/3 delegations, an allowed purchase, a budget rejection, and authority
   cancellation. All payment results are labeled `SIMULATED`; no fabricated
   signature or Explorer link is shown.
2. **Live Devnet** preserves the existing wallet authentication, task funding,
   policy enforcement, and x402 flow. It is labeled as a local/single-process
   path until durable hosted state and a reachable merchant are configured.

This is the smallest reliable submission surface. It avoids representing an
ephemeral serverless process as durable infrastructure and keeps the honest
trust boundary visible.

## Components

### Public demo state machine

A pure TypeScript reducer owns the public-demo state. Its actions are:

- `initialize`: create the fixed 10/4/3 hierarchy.
- `allow_purchase`: reserve and settle a small permitted research purchase.
- `reject_over_budget`: record a rejection without changing settled spend.
- `cancel_research`: cancel the research authority.
- `reject_after_cancel`: record a rejection without creating a transfer.
- `reset`: return to the initial state.

The reducer uses integer base units and derives available amounts from
allocation, settled spend, pending reservations, and active child allocations.
Focused tests cover each transition and prove that rejected actions do not
consume budget.

### Public demo interface

The interface reuses Pactlet's dashboard visual language and shows:

- mode selector and an explicit `Simulation` badge;
- task and delegation tree;
- remaining budgets;
- guided action buttons in demo order;
- policy event log and rejection reasons;
- a trust note separating simulated UI behavior from real devnet evidence.

### Live devnet interface

The current `WalletConnect` flow remains available under `Live Devnet`. Its copy
will state that the hosted Vercel build does not yet provide durable signer and
ledger storage. Local development continues to use `.env`, SQLite, and the
separate merchant process.

### Production environment handling

- Keep `.env` ignored and never upload it as a deployment artifact.
- Keep local origin and local database settings in `.env`.
- Set Vercel's public origin independently.
- Do not upload `PACTLET_DATABASE_PATH=./pactlet.db` to Vercel.
- Do not configure Vercel with a loopback merchant URL.
- Transfer only deployment-required secrets through Vercel's encrypted
  environment interface, never through Git, logs, or command arguments.

## Error handling

Public-demo transitions are deterministic and cannot issue network requests.
Invalid repeated actions are disabled in the UI. Live mode keeps its existing
errors, but the hosted-storage limitation appears before a user attempts the
flow instead of failing silently after wallet connection.

## Test and deployment gates

- Reducer tests fail before implementation and pass afterward.
- Existing 71 policy/payment tests remain green.
- Typecheck and production build pass.
- Secret and legacy-name scans remain clean.
- `/` and `/app` return HTTP 200 publicly.
- A browser test clicks `Launch demo`, completes the public-demo sequence, and
  sees no console errors.
- Vercel protection remains disabled.

## Backlog for a fully working hosted MVP

### P0 — Required for real public devnet settlement

- Add durable transactional storage such as Turso/libSQL or hosted PostgreSQL.
  Preserve unique purchase keys and atomic budget reservation semantics.
- Replace in-memory nonce/session maps with signed, expiring challenges and
  durable or cryptographically verifiable sessions.
- Store disposable task signers in a dedicated encrypted key-management layer;
  never place signer bytes in browser storage, cookies, Git, or ordinary DB
  columns.
- Deploy the x402 merchant to a public HTTPS endpoint and remove every loopback
  dependency from production configuration.
- Provision the merchant's devnet-USDC associated token account and verify its
  mint, owner, rent funding, and recipient address.
- Re-check the facilitator `/supported` response for x402 V2, Solana devnet, and
  `exact` immediately before enabling the hosted paid route.
- Complete one real devnet funding transaction and one x402 settlement; store
  and display their confirmed Explorer signatures.

### P1 — Reliability and reconciliation

- Add a settlement reconciliation worker for facilitator/RPC timeouts.
- Keep unknown settlements pending and reservations locked until chain status
  is resolved.
- Add webhook or polling recovery that survives process restarts and deploys.
- Encrypt signer material at rest and define rotation, deletion, and incident
  recovery procedures.
- Add hosted concurrency tests proving two requests cannot exceed one budget.
- Add end-to-end tests for wallet reconnect, cold starts, duplicate purchases,
  expired authority, cancellation, and definite versus unknown failures.

### P2 — Submission and operational hardening

- Configure production monitoring without logging secrets or payment payloads.
- Add rate limiting and abuse protection to nonce, task, and purchase routes.
- Add a public health/readiness endpoint that reports capabilities, not secrets.
- Replace deterministic Jev fallback with the real TypeSafe API once configured;
  continue to label fallback routing accurately.
- Record the three-minute demo with the confirmed devnet Explorer transaction.
- Reconcile the dashboard ledger against the confirmed transaction's token
  balance changes, mint, source, destination, and amount.

## Out of scope for this pass

- Mainnet or real-value funds.
- Multi-chain support.
- Trustless or onchain-enforced policy claims.
- A marketplace, general agent wallet, A2A protocol, or smart-account system.
- Deploying new paid infrastructure without an explicit user decision.
