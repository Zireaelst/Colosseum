# pactlet roadmap

Deadline: 13 October 2026, 09:59 Europe/Istanbul. Build the narrow end-to-end demo before visual polish.

## M0 — foundation and feasibility (`complete`)

Acceptance:

- Repository/toolchain inventory is recorded.
- Product, architecture, security, demo, environment, and operating instructions exist.
- Exact dependency versions are locked.
- A spike proves the chosen x402/Kit imports and runtime construction.
- Live facilitator `/supported` advertises V2 + Solana devnet + `exact`.
- Devnet USDC mint, an associated recipient token account, and a test-token acquisition path are verified.

## M1 — policy rules and ledger (`complete`)

Acceptance:

- Pure rules reject service widening, budget overflow, expiry widening, cancellation, wrong mint/network/recipient, and invalid integer amounts.
- SQLite transaction atomically computes availability and reserves a purchase.
- Duplicate purchase keys return one outcome.
- Two concurrent purchases cannot exceed the allocation.
- Definite failure releases; uncertain settlement stays reserved.

Evidence: 39 tests cover delegation, payment-term validation, atomic reservation, idempotency, competing requests, cancellation/expiry, active child allocations, failed/pending/confirmed settlement, signature persistence, and descendant spend after child expiry. `pnpm test` and `pnpm typecheck` pass.

An approved structured task-mandate extension is now implemented. Each task
stores its purpose, configured `research-api / research-brief` identity,
per-purchase base-unit maximum, and expiry. Atomic reservation rejects a wrong
resource, per-purchase overflow, or conflicting reuse of a `purchaseRef` before
signer loading/payment. The model-facing purchase tool has no arguments.

## M2 — task account and real devnet transfer (`implemented; live transfer pending`)

Acceptance:

- Wallet Standard connection and nonce ownership proof work.
- A 10 test-USDC task can be funded into a disposable task account.
- The UI previews payer, mint, base-unit amount, and recipient before broadcast.
- At least one real devnet token transfer has a confirmed Explorer signature.

Wallet proof, funding construction, preview, confirmation polling, exact
transaction attribution, and Explorer rendering are implemented and tested. A
funding signature is persisted only when the parsed transaction matches the
connected wallet payer, derived source ATA, task ATA, devnet USDC mint, six
decimals, and exact 10,000,000 base-unit source/destination deltas. No wallet
transaction has been approved/broadcast in this environment, so the last
acceptance item is open.

## M3 — x402 V2 exact purchase (`implemented; live settlement pending`)

Acceptance:

- The fixed merchant emits a valid V2 `PAYMENT-REQUIRED` challenge.
- Research agent purchase settles devnet USDC through the supported facilitator.
- Reservation, settlement, signature, and reconciliation are idempotent.
- Unsupported merchant, mint, network, recipient, amount, or redirect fails before signing.

The fixed Express merchant is deployed at a public Railway HTTPS endpoint and
returned a package-generated V2 devnet `exact` challenge for the pinned mint,
1,000 base units, and configured recipient. The purchase path uses official
x402 schema/header codecs and SVM signer, reserves before signing, retains
ambiguous settlement, and is idempotent. A funded live settlement/signature
remains open.

## M4 — manager and specialists (`implemented; credentialed run pending`)

Acceptance:

- Manager owns the final response and calls research/analysis agents as bounded tools.
- Jev routes only `research`, `analysis`, or `uncertain`.
- `uncertain` requests do not pay by default.
- Any deterministic fallback is visibly labeled and not represented as Jev.

The manager owns final output and exposes exactly one routed specialist as a tool. Only research receives the server-bound purchase tool. Jev uses model `jev-1.13`; confidence below 0.6 becomes `uncertain`. Missing TypeSafe credentials produce an explicitly labeled deterministic fallback. The Agents SDK now defaults to Groq's free `openai/gpt-oss-20b` through Chat Completions; missing AI credentials return a separate `demo-fallback` and cannot purchase.

## M5 — minimal dashboard (`implemented`)

Acceptance:

- Task allocation, available amount, delegation tree, events, rejection reasons, and Explorer link match ledger state.
- Manager delegates 4 and 3 USDC without exceeding the 10 USDC parent allocation.
- Cancellation blocks a later purchase.

The authenticated task snapshot renders the structured mandate, 10/4/3
allocation tree, available amounts, service scopes, states, events, rejection
reasons, purchase references, payment preview, Explorer links, and boolean
runtime readiness. Cancellation is a server action and new demo runs use
distinct purchase references. The public deployment now defaults to a
deterministic browser-only walkthrough of allowed, over-budget, cancelled, and
post-cancellation decisions; every result is explicitly labeled simulated.

## M6 — verification and demo handoff (`in progress`)

Acceptance:

- Security and end-to-end tests cover the user acceptance cases.
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.
- README and three-minute demo label every real and simulated component accurately.

Current gate: the Pactlet landing page and `/app` public walkthrough use the provided brand assets, and the complete automated suite, typecheck, and production build are required before each deployment. Remaining critical evidence is one user-approved devnet funding transaction followed by one real x402 settlement and Explorer verification. The live Groq and Jev calls remain credential-gated; local `.env` secrets are intentionally not committed. Durable hosted-live requirements are prioritized as P0–P2 in `docs/superpowers/specs/2026-10-13-public-demo-design.md`.

### Hosted-live P0 progress

- Wallet challenges are now HMAC-signed, origin-bound, and valid for five minutes.
- Wallet sessions are cryptographically verifiable for thirty minutes and no
  longer depend on a process-local session map.
- Missing or short `PACTLET_SESSION_SECRET` fails the live authentication route
  closed without affecting the browser-only public walkthrough.
- The merchant validates its fixed recipient and refuses to listen unless the
  live facilitator advertises x402 V2 Solana devnet `exact`. It is deployed on
  Railway with an explicit public bind host and platform-provided `PORT`; its
  public `/health` and unpaid `/research` challenge are verified.
- Supabase Postgres now stores hosted tasks, mandates, encrypted task signers,
  delegations, reservations, settlements, and events. Row-locking database RPCs
  enforce reservation and idempotency transitions. A live concurrency test
  proved competing 3 USDC reservations cannot jointly exceed a 4 USDC budget.
- All ledger tables have RLS enabled; direct `anon` and `authenticated` access
  is revoked. Supabase security and performance advisors reported no issues.
- Still open: production-grade managed remote signing and confirmed
  funding/x402 Explorer signatures.
