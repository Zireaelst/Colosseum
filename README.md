# Pactlet

Pactlet is a devnet-only Colosseum Crypto World's Fair MVP for enforcing task-scoped hierarchical authority at the point an AI agent attempts an x402 payment.

The Solana transaction proves the token transfer. Budget, service, expiry, cancellation, and delegation rules are enforced by a trusted backend and SQLite ledger. This is a custodial prototype, not a trustless agent wallet or production payment system.

## Current status

M0/M1 are complete. The M2–M5 code path is implemented: wallet proof,
disposable task account, structured task mandate, 10 test-USDC funding
transaction, 4/3 specialist delegations, fixed x402 merchant, guarded purchase
service, Jev routing, Agents SDK manager/specialists, and backend-driven
dashboard. The mandate binds a human purpose, configured service/resource,
per-purchase limit, expiry, and explicit idempotent `purchaseRef` before signing.
`/app` also includes a deterministic public walkthrough that works without a
wallet or server state and labels every result `SIMULATED`. The automated suite,
typecheck, and production build are the release gates. A local merchant smoke
test returned a real package-generated V2 `exact` challenge. No devnet transfer
or x402 settlement has been broadcast yet, so onchain acceptance remains
pending devnet configuration and an explicit wallet approval.

See [docs/feasibility.md](docs/feasibility.md), [docs/architecture.md](docs/architecture.md), [docs/security.md](docs/security.md), [docs/roadmap.md](docs/roadmap.md), and the [Turkish submission package](docs/submission-tr.md).

## Requirements

- Node.js 22
- pnpm 12.4.1 via Corepack
- A Solana wallet that supports Wallet Standard for the later browser flow
- Devnet SOL for task setup where needed
- Devnet USDC from Circle's faucet for the later funding/payment flow

Never use mainnet or real-value tokens with this repository.

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm test
pnpm typecheck
pnpm build
```

Only fill server-side variables locally. Do not paste API keys or private keys into issues, chat, screenshots, or commits.

Generate the two Pactlet server secrets locally and paste their outputs only into
your ignored `.env` file (and the deployment provider's encrypted environment
settings when a live backend is deployed):

```bash
openssl rand -base64 48
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Use the first output for `PACTLET_SESSION_SECRET` and the second for
`PACTLET_SIGNER_MASTER_KEY`. Keep both stable across restarts. Rotating the signer
master key without re-encrypting stored records makes existing task signers
unreadable.

### Free AI provider

The default model provider is Groq's OpenAI-compatible API using `openai/gpt-oss-20b`, which Groq currently lists on its free plan and documents as supporting tool use. Create a Groq API key locally, then set only `AI_API_KEY` in `.env`; `AI_BASE_URL` and `AI_MODEL` already have usable defaults in `.env.example`. The key never reaches the browser.

Without `AI_API_KEY`, the dashboard remains usable and the manager returns a clearly labeled `demo-fallback` without attempting a purchase. This is not represented as a live AI run. Any other Chat Completions-compatible provider can be selected by overriding `AI_BASE_URL` and `AI_MODEL`.

- Groq free-plan limits: https://console.groq.com/docs/rate-limits
- Model details: https://console.groq.com/docs/model/openai/gpt-oss-20b

## Devnet constants

- x402 network: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Circle devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Explorer: use `https://explorer.solana.com/tx/<signature>?cluster=devnet`
- Test USDC: https://faucet.circle.com/?chain=SOL
- Devnet SOL: https://faucet.solana.com/

Before enabling a paid route, verify the configured facilitator's `/supported` response still includes x402 V2 + `exact` + the devnet CAIP-2 identifier.

## Commands

```bash
pnpm test
pnpm typecheck
pnpm spike:x402
pnpm build
pnpm dev
pnpm merchant
```

The marketing landing page is served at `/`; the public walkthrough and live-devnet interface are at `/app`.

`/app` defaults to **Public Demo**, a browser-only deterministic walkthrough of the 10/4/3 delegation, allowed purchase, budget rejection, cancellation, and post-cancellation rejection. It creates no signature or transfer. **Live Devnet** preserves the wallet-backed local flow, which still requires one long-running Node process, SQLite, and the separate merchant service.

Run `pnpm merchant` beside `pnpm dev` after configuring the devnet facilitator
and merchant owner. Connect a Wallet Standard Solana wallet, sign the nonce,
enter the task purpose, and create the fixed paid-research mandate. Inspect the
exact funding preview before approving the devnet transaction. The paid action
stays unavailable until funding is confirmed.

## Limitations

- Single local Node process and SQLite ledger only.
- Backend-held disposable devnet task keys encrypted in local SQLite with a
  server-only AES-256-GCM key; this is not a production KMS.
- No smart account, onchain policy program, distributed lock, HA, or production KMS.
- No arbitrary paid URLs, marketplace, multichain routing, A2A, Swig, or custom Solana program.
- A timeout after broadcast is pending, not a definite failure; funds remain reserved until reconciliation.
- Cancellation prevents new purchases but cannot undo an already broadcast transaction.
- Funding confirmation attributes the submitted parsed transaction to the
  connected wallet payer, derived source ATA, task ATA, devnet USDC mint, and
  exact 10,000,000 base-unit token delta. The result still trusts the configured
  devnet RPC response.
- Groq, TypeSafe/Jev, facilitator, RPC, and merchant readiness are shown as booleans only; secret values are never returned by the task API.
- The Vercel public walkthrough is deliberately simulated. A durable hosted live mode requires the P0 work in [the hosted MVP backlog](docs/superpowers/specs/2026-10-13-public-demo-design.md#backlog-for-a-fully-working-hosted-mvp).
