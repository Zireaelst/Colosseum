# beeple roadmap

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

## M2 — task account and real devnet transfer (`implemented; live transfer pending`)

Acceptance:

- Wallet Standard connection and nonce ownership proof work.
- A 10 test-USDC task can be funded into a disposable task account.
- The UI previews payer, mint, base-unit amount, and recipient before broadcast.
- At least one real devnet token transfer has a confirmed Explorer signature.

Wallet proof, funding construction, preview, confirmation polling, and Explorer rendering are implemented and tested. No wallet transaction has been approved/broadcast in this environment, so the last acceptance item is open.

## M3 — x402 V2 exact purchase (`implemented; live settlement pending`)

Acceptance:

- The fixed merchant emits a valid V2 `PAYMENT-REQUIRED` challenge.
- Research agent purchase settles devnet USDC through the supported facilitator.
- Reservation, settlement, signature, and reconciliation are idempotent.
- Unsupported merchant, mint, network, recipient, amount, or redirect fails before signing.

The fixed Express merchant returned a package-generated V2 devnet `exact` challenge in a local HTTP smoke test. The purchase path uses official x402 schema/header codecs and SVM signer, reserves before signing, retains ambiguous settlement, and is idempotent. A funded live settlement/signature remains open.

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

The authenticated task snapshot renders the 10/4/3 allocation tree, available amounts, service scopes, states, events, rejections, payment preview, Explorer links, and boolean runtime readiness. Cancellation is a server action and new demo runs use distinct purchase keys.

## M6 — verification and demo handoff (`in progress`)

Acceptance:

- Security and end-to-end tests cover the user acceptance cases.
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.
- README and three-minute demo label every real and simulated component accurately.

Current gate: 71 tests, typecheck, and production build pass. Remaining critical evidence is one user-approved devnet funding transaction followed by one real x402 settlement and Explorer verification. The live Groq and Jev calls remain credential-gated; `.env.local` is intentionally not populated in the repository.
