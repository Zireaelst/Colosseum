# pactlet architecture

## Objective and trust model

pactlet is a devnet-only, single-process hackathon MVP. It demonstrates a pluggable payment layer that checks task-scoped hierarchical authority at the instant an agent attempts an x402 purchase.

The backend is trusted. It owns the SQLite ledger, agent runtime context, per-task disposable signer, policy checks, payment reservation, and settlement reconciliation. Solana proves only the token movement and transaction signature. Delegation rules are not onchain-enforced.

## Components

- **Next.js web and API:** wallet connection, nonce ownership proof, task creation, delegation views, event feed, rejection details, and Explorer links.
- **Policy core:** pure TypeScript validation for monotonic delegation, service allowlists, expiry, cancellation, and base-unit amounts.
- **SQLite ledger:** tasks, agents/delegations, allowed services, payment requests, reservations, settlements, and append-only events. It is for one local process, not a distributed/serverless deployment.
- **Purchase service:** the only payment tool visible to agents. It resolves a configured service ID, validates the x402 challenge, reserves budget atomically, signs with the task's disposable signer, settles, reconciles, and records the outcome.
- **Express merchant:** one fixed paid research endpoint protected by x402 V2 `exact` middleware.
- **Agent runtime:** one manager remains responsible for the final response and invokes research/analysis specialists as bounded tools. The Agents SDK uses Groq's free OpenAI-compatible Chat Completions endpoint by default; the API key stays server-side. Jev only classifies a subtask as research, analysis, or uncertain. Missing AI credentials produce a labeled no-payment fallback.

## Authority and data model

Persist these concepts separately:

- `tasks`: user wallet, task payment account, mint, allocation, status, expiry.
- `delegations`: parent, child runtime identity, allocation, expiry, status.
- `delegation_services`: configured service IDs allowed for a delegation.
- `payment_requests`: purchase key, agent runtime identity, merchant challenge, requested base units.
- `reservations`: atomic hold against one delegation while settlement is unresolved.
- `settlements`: x402 status, transaction signature, network, mint, recipient, confirmed base units.
- `events`: ordered, display-safe facts for the dashboard.

A child budget cannot exceed the parent's available amount, its expiry cannot exceed the parent's expiry, and its service set must be a subset. Available amount is:

`allocation - settled spending - pending reservations - active child allocations`

The availability check and reservation write happen in one immediate SQLite transaction. Unique constraints cover task-scoped purchase keys and transaction signatures.

## Payment data flow

1. The agent calls `purchase` with a configured service ID and idempotency key. It cannot submit a URL or signer.
2. The server loads agent identity and delegation from runtime context, then rejects cancellation, expiry, or service mismatch.
3. The server calls the exact allowlisted endpoint without following redirects and receives `PAYMENT-REQUIRED`.
4. x402 libraries decode the challenge. pactlet additionally matches V2, `exact`, devnet CAIP-2, devnet USDC mint, configured `payTo`, maximum amount, and resource identity.
5. One SQLite transaction creates or reuses the purchase request and reserves available budget.
6. The task signer authorizes the x402 payment. The facilitator verifies and settles it on Solana devnet.
7. A confirmed result consumes the reservation and stores the signature. A definite pre-broadcast failure releases it. A timeout or `settlement_pending` keeps it reserved until RPC reconciliation determines the final state.

## Wallet flow

Wallet Standard is used in the browser. The server issues a short-lived, origin-bound nonce; the wallet signs it; the server verifies ownership before creating a task. Task funding is a separate, clearly previewed devnet token transfer. The user wallet never signs an agent purchase.

## Backend-enforced vs onchain-observed

| Concern | Enforcement/evidence |
| --- | --- |
| Token owner authorized transfer | Solana/x402 signature verification |
| Mint, destination and exact amount in payment | x402 SVM verification and Solana transaction |
| Transaction confirmed | Solana devnet RPC and Explorer signature |
| Hierarchical budget and child allocation | Trusted pactlet backend + SQLite transaction |
| Service allowlist, expiry and cancellation | Trusted pactlet backend |
| Agent identity | Trusted server runtime context |
| Idempotent purchase outcome | SQLite unique constraints + reconciliation |

## Deferred

Production custody/KMS, smart accounts, onchain policy programs, multi-chain support, A2A, Swig, Helius MCP, distributed locking, serverless deployment, and a general marketplace are outside the MVP.
