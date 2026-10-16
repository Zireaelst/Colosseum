# Pactlet

**Task-scoped spending authority for AI agents on Solana devnet.**

A user defines a task, funds it with test USDC, and gives a manager limited spending authority. The manager delegates smaller budgets and service permissions to research and analysis specialists. Pactlet checks authority at the backend purchase service before a payment is signed.

[Website](https://pactlet-colosseum.vercel.app) · [Live app](https://pactlet-colosseum.vercel.app/app) · [Simulation](https://pactlet-colosseum.vercel.app/demo) · [Docs](https://pactlet-colosseum.vercel.app/docs)

## Features

| Capability | Behavior |
| --- | --- |
| Wallet ownership | Solana Wallet Standard discovery through the Kit wallet plugin, with nonce-signature verification. |
| Task permissions | Task purpose, fixed research product, 0.001 test-USDC purchase limit, and a 45-minute window. |
| Delegation | A 10 test-USDC manager budget narrows to 4 for research and 3 for analysis. |
| Saved tasks | Owner-scoped history, 20 tasks per page, with confirmed/unconfirmed funding filters. |
| Task search | Search the currently loaded page by task ID, payment address, or funding signature. |
| Resume work | Reopen `/app?task=<id>`, reload, or use Back/Forward. A valid server session is reused only for the same connected wallet. |
| Funding recovery | Refresh a submitted transaction’s status without sending another transfer. HTTP 202 remains pending. |
| Budget overview | Settled spend, held reservations, and unspent/unreserved funds; specialist availability remains separate in the tree. |
| Payment history | Search the selected task’s payment snapshot by service, resource, reference, signature, or decision code. Filter All, Pending, Settled, Rejected, or Failed and browse 20 results per page. |
| Decision details | Expand an attempt for a plain-language explanation, decision code, reference, and any recorded signature. |
| Copy and export | Copy public identifiers or download a JSON task/payment record without signer material or raw payment credentials. |
| Cancellation | Cancel research authority to block new purchases. Submitted transfers cannot be reversed. |

Task and payment filters are reflected in the URL. Sharing a link does not grant access; the backend verifies the session and task owner.

## Implementation versus payment evidence

Wallet, task, funding, policy, merchant, agent orchestration, persistence, and dashboard code paths are implemented. The public merchant has returned a package-generated x402 V2 `exact` challenge. Hosted authentication, task creation, delegation snapshots, and an analysis-agent response have previously been exercised.

**A complete, confirmed funding → x402 settlement transaction has not yet been recorded as acceptance evidence.** A dashboard, merchant challenge, browser fixture, or deployment does not prove settlement. Confirmed funding and paid-settlement Explorer signatures remain open gates in [the roadmap](docs/roadmap.md). Demo recording is deferred.

This is a **custodial devnet prototype**. The backend holds encrypted disposable task signing keys. Agents receive only the backend purchase capability. Solana proves the token transfer and signature; the trusted backend enforces budget, hierarchy, services, expiry, cancellation, and idempotency. Pactlet is a payment-control layer, not a marketplace or general agent wallet, and makes no “first hierarchical agent budget” claim.

## Use the app

1. Open the live app with an installed/unlocked Solana wallet. On mobile, use a Solana wallet browser.
2. Connect and sign the ownership challenge. Authentication does not fund a task.
3. Create a task or open a saved one. Task search and funding filters apply to the current history page.
4. Review the wallet payer, task account, recipient token account, devnet mint, and exact `10,000,000` base-unit funding amount before approving funding.
5. Once the server confirms funding, run the agent and inspect its payment decisions.
6. Use **Refresh status** for pending funding, **Details & receipt** to inspect an attempt, and **Export task** to download the full task/payment record.

The separate `/demo` route is a deterministic browser simulation. Events are labelled `SIMULATED`; it signs and broadcasts nothing.

## Architecture

```text
User wallet → ownership proof → task mandate + disposable payment account
                                      ↓
                              manager authority
                              ↙               ↘
                       research (4)        analysis (3)
                              ↓
                     backend purchase service
                              ↓
fixed merchant → challenge validation → atomic reservation
                              ↓
                  sign / settle → chain check → ledger receipt
```

- Child authority only narrows the parent’s budget, service allowlist, and expiry.
- All amounts are integer token base units. Availability and reservation change atomically.
- Hosted state uses Supabase Postgres and transactional RPCs. SQLite is the single-process local/test reference.
- Unknown settlement retains its reservation; a definite pre-broadcast failure releases it.
- A duplicate purchase reference replays its recorded outcome.
- Only configured merchant endpoint IDs are accepted; arbitrary paid URLs and redirects are rejected.
- Jev routes `research`, `analysis`, or `uncertain`. It does not choose budgets or sign payments. Low confidence does not default to a paid action.

## Local development

Requirements: Node.js 22 and pnpm 12.4.1.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

In a second terminal, after filling the merchant configuration:

```bash
pnpm merchant
```

The merchant checks facilitator support at startup. A paid flow needs devnet test USDC/SOL, configured server services, and a user-approved funding transaction.

### Environment

Use [.env.example](.env.example) for the complete variable reference. Store values only in an ignored environment file or the hosting provider’s encrypted settings.

| Variables | Purpose |
| --- | --- |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Server-side compatible model provider. Defaults target Groq and `openai/gpt-oss-20b`; quotas and availability may vary. |
| `TYPESAFE_API_KEY` | Optional live Jev routing. Missing credentials use an explicitly labelled deterministic fallback. |
| `PACTLET_SESSION_SECRET` | At least 32 random characters for signed challenges and sessions. |
| `PACTLET_SIGNER_MASTER_KEY` | Stable, 32-byte base64url key for task signer encryption. |
| `SOLANA_DEVNET_RPC_URL` | Solana devnet RPC. |
| `X402_FACILITATOR_URL` | Facilitator advertising V2 + Solana devnet + `exact` in live `/supported`. |
| `X402_MERCHANT_PAY_TO`, `X402_MERCHANT_URL` | Merchant owner address and fixed paid endpoint. |
| `X402_MERCHANT_HOST`, `X402_MERCHANT_PORT` | Merchant bind settings; hosting platform `PORT` takes precedence. |
| `PACTLET_DATABASE_PATH` | Local SQLite path, one process only. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only hosted persistence. |
| `NEXT_PUBLIC_APP_ORIGIN` | Correct browser origin, including the local port or production hostname. |

Generate the two secrets locally and store their outputs only in the ignored environment file:

```bash
# PACTLET_SESSION_SECRET
openssl rand -base64 48

# PACTLET_SIGNER_MASTER_KEY
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep the signer master key stable. Changing it without re-encrypting stored signers makes existing task accounts unreadable. Keys must never use a `NEXT_PUBLIC_` prefix or appear in chat, logs, screenshots, or source control.

Without `AI_API_KEY`, the manager returns `demo-fallback` and does not purchase. Without `TYPESAFE_API_KEY`, routing uses the labelled deterministic fallback. Neither is presented as a live integration.

### Devnet constants

| Setting | Value |
| --- | --- |
| x402 network | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Task funding | `10,000,000` base units / 10 test USDC |
| Merchant price | `1,000` base units / 0.001 test USDC |
| Explorer | `https://explorer.solana.com/tx/<signature>?cluster=devnet` |

Test-token sources: [Circle faucet](https://faucet.circle.com/?chain=SOL) and [Solana devnet SOL faucet](https://faucet.solana.com/). Never use mainnet or real-value assets.

## Tests

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm spike:x402
pnpm spike:wallet
```

Coverage includes policy narrowing, terms validation, concurrent reservations, idempotency, settlement states, wallet ownership, funding attribution, owner-scoped history, session recovery, budget summaries, and history filters. Dependency versions are pinned in `pnpm-lock.yaml`. The wallet plugin and x402 graph use their separately tested Kit dependency families; do not flatten them based on unrelated examples.

For browser fixture QA, run the app locally, then:

```bash
node scripts/qa/task-workspace.cjs
```

Playwright must be available. `PLAYWRIGHT_MODULE_PATH` and `PLAYWRIGHT_EXECUTABLE_PATH` can point to an existing installation. The script intercepts every API request and uses a test wallet. It checks reload, navigation, pending funding, retry references, exports, filters, and mobile behavior. It does not verify real authentication or create chain evidence.

## API

Private routes require the signed HttpOnly `pactlet_session` cookie and task ownership. History/session responses use `private, no-store` caching.

| Route | Purpose |
| --- | --- |
| `POST /api/auth/nonce` | Origin-bound wallet challenge. |
| `POST /api/auth/verify` | Verify ownership; establish a thirty-minute session. |
| `GET /api/auth/session` | Inspect the signed session. |
| `DELETE /api/auth/session` | Clear this browser’s session cookie. |
| `GET /api/tasks?offset=0` | Up to 20 owner-scoped summaries plus `hasMore`. |
| `POST /api/tasks` | Create the task account and authority. |
| `GET /api/tasks/:id` | Task/delegation/payment/event snapshot. |
| `POST /api/tasks/:id/funding-transaction` | Build the reviewed funding transaction. |
| `POST /api/tasks/:id/funding-status` | Verify submitted funding for this task. |
| `POST /api/tasks/:id/run` | Manager/specialist execution with a purchase reference. |
| `POST /api/tasks/:id/purchase` | Configured guarded purchase. |
| `POST /api/tasks/:id/cancel` | Cancel research authority for new purchases. |

## Limits and next work

- Confirmed funding and real x402 settlement signatures remain open acceptance gates.
- Custody needs production key management and a defined recovery model.
- Pending funding hints are browser-local until server confirmation; clearing storage removes them. Paid settlement has no continuous reconciliation worker.
- Agent retries reuse the reference while the task remains open. Full run/output persistence across sessions remains future work.
- Task search covers the loaded page; payment search covers the selected snapshot. Large histories still need server-side payment pagination.
- Confirmation trusts the configured devnet RPC. HTTP 202 never enables the funded state.
- Cancellation blocks new reservations and cannot undo submitted transfers.
- Rate limiting, abuse controls, monitoring, managed signing, and production operations remain backlog items.
- No mainnet, arbitrary paid URLs, multichain, A2A, onchain policy enforcement, or production-security claim.

## More documentation

[Architecture](docs/architecture.md) · [Security](docs/security.md) · [Roadmap](docs/roadmap.md) · [Feasibility](docs/feasibility.md) · [UI guidelines](docs/ui-guidelines.md) · [Demo and evidence labels](docs/demo.md)
