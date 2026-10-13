# pactlet repository instructions

## Product

`pactlet` is the project name. Do not rename it to AgentPass. The MVP demonstrates task-scoped hierarchical authority enforced at the moment an AI agent attempts an x402 payment.

The user connects a Solana wallet, funds a task with devnet test tokens, and delegates narrower budgets, service allowlists, and expiries to a manager and two specialist agents. An allowed paid request produces a real Solana devnet signature. Disallowed requests are rejected before signing or broadcasting.

This is not an agent wallet, marketplace, trustless policy system, or production custody product. Do not claim novelty as the first hierarchical agent budget. DPX Policy Engine, AgentWallet, and the earlier Colosseum project AgentPass Guard are explicit comparison points.

## Non-negotiable boundaries

- Devnet only. Reject any mainnet network identifier, RPC, mint, or Explorer URL.
- Never use real user funds or request secrets in chat.
- Never log, commit, render, or send `AI_API_KEY`, `TYPESAFE_API_KEY`, signer bytes, seed phrases, wallet session credentials, or raw payment credentials.
- The connected user wallet authenticates and funds the task. It is not exposed to agents.
- Each task gets a disposable backend-held devnet payment account. This is a custodial prototype and must be labeled as such.
- Agents never receive keys. Their only payment capability is the backend purchase service.
- Agent identity and delegation come from server runtime context, never model-authored text.
- Paid URLs and redirects are deny-by-default. Only configured merchant endpoint IDs may be purchased.
- Show the payer account, devnet mint, base-unit amount, and recipient before any real devnet transfer.
- Do not deploy, publish, create a PR, submit to Colosseum, use mainnet, or access an external account without a separate user decision.

## Enforcement model

The Solana chain proves the token transfer and transaction signature. Budget, service, expiry, cancellation, and hierarchy rules are enforced by the trusted backend. Never describe them as onchain-enforced, trustless, or production secure.

All token amounts are integer base units. A child may only narrow its parent's authority. Available amount is allocation minus settled spend, pending reservations, and active child allocations. Availability calculation and reservation must be one SQLite transaction. A duplicate purchase key returns the original outcome and must not create a second transfer.

Unknown settlement remains pending and keeps its reservation. Only a definite pre-broadcast failure releases it. Cancellation and expiry block new reservations but cannot reverse a broadcast Solana transaction.

## Delivery order and test gates

Work in milestone order from `docs/roadmap.md`. For every behavior change:

1. Write one focused failing test and run it.
2. Implement the smallest passing change.
3. Run focused tests, then the full test and typecheck commands.
4. Record milestone status and any real/simulated boundary in the docs.

Before any x402 route is enabled, verify the facilitator's live `/supported` response contains x402 V2, `exact`, and `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`. Validate network, mint, recipient, amount, service, expiry, cancellation, and idempotency before signing. Use x402 package verification; do not write a partial custom verifier.

## Source hierarchy

Use current primary documentation and pin every dependency in `pnpm-lock.yaml`:

- https://solana.com/docs/payments/agentic-payments/x402
- https://solana.com/docs/tools/x402-facilitator
- https://solana.com/docs/clients/official/javascript
- https://github.com/x402-foundation/x402
- https://developers.openai.com/api/docs/guides/agents/sdk
- https://developers.openai.com/api/docs/guides/agents/orchestration
- https://docs.typesafe.ai/sdk/javascript
- https://docs.typesafe.ai/model-jaggedness/jev-1.13
- https://colosseum.com/worldsfair/resources

Do not combine peer-incompatible versions because examples look similar. Prove important combinations with a small typecheck/runtime spike and document the result in `docs/feasibility.md`.

## Reporting

For each milestone, report: status, commands run, tests passed/failed, onchain evidence (if any), simulated parts, blockers, and the smallest next step. Never turn an unverified assumption into a completion claim.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
