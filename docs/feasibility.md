# M0 feasibility record

Verified on 12 October 2026 from Europe/Istanbul. Live services can change; startup checks remain mandatory.

## Environment

- Git: clean `main` at initial commit `4fbc352` before pactlet changes.
- Node.js: `v22.23.2` reported in the repository shell.
- pnpm: `12.4.1` reported before project pinning.
- Solana Developer MCP and OKX MCP: not connected in this session.
- Solana Foundation `solana-dev-skill`: not installed locally.
- Colosseum Copilot skill: installed, but its connector package was not installed; no protected Copilot evidence was used.

## Dependency decision

| Package | Pinned version | Decision |
| --- | ---: | --- |
| `@x402/core`, `@x402/express`, `@x402/fetch`, `@x402/svm` | `2.28.0` | Same release line; current registry versions at verification time. |
| `@solana/kit` | `5.5.1` | Newest 5.x compatible with x402's direct `>=5.1.0` peer and transitive Solana program `^5.0` peers. |
| `@solana/sysvars` | `5.5.1` | Directly pinned so the token-2022 peer does not auto-resolve to incompatible 8.x. |
| `@solana-program/token` | `0.9.0` | Matches the x402 SVM dependency line and provides ATA derivation. |
| TypeScript | `5.9.3` | Satisfies Solana Kit 5.x's `^5.0.0` peer. |
| Next / React | `16.4.0` / `19.3.0` | Current registry versions; Node 22 satisfies Next's engine floor. |
| OpenAI Agents SDK | `0.20.0` | Current registry version; manager-as-tools pattern matches official orchestration docs. |
| TypeSafe SDK | `0.6.0` | Current registry version; requires Node 20+, satisfied by Node 22. |
| SQLite / Vitest | `better-sqlite3 13.0.3` / `vitest 5.0.4` | Current registry versions; SQLite driver requires Node 22. |

`@solana/kit 8.4.0` was tested and rejected for the payment package: x402 2.28.0 compiled, but pnpm reported incompatible `^5.0` peer requirements from `@solana-program/token`, `token-2022`, and compute-budget packages. The accepted graph installed without peer warnings. A strict TypeScript compile and a runtime construction of x402 client + Express resource server succeeded with x402 2.28.0 and Kit 5.5.1.

## x402 and devnet gate

Live `GET https://x402.org/facilitator/supported` returned a kind with:

- `x402Version: 2`
- `scheme: exact`
- `network: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- facilitator fee payer `CKPK…WYp5`

The public facilitator is suitable for development/testnet only. pactlet must recheck this tuple at startup and fail closed if it disappears.

Solana devnet RPC parsed `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` as an initialized, six-decimal SPL Token mint owned by the Token Program. For the documented owner `seFk…fsRX`, the Kit-compatible ATA derivation produced `Ghw5…4DNP`; devnet RPC returned that exact initialized account for the same mint and owner.

Circle's public faucet lists Solana Devnet and currently offers 20 test USDC per address/network every two hours. Faucet interaction is a user setup step; M0 did not request tokens or create an onchain transaction.

## Reproducible verification

- `pnpm install --frozen-lockfile` completed with pnpm 12.4.1 and ran the approved `better-sqlite3` and `esbuild` native scripts.
- `node --input-type=module -e '…'` opened an in-memory better-sqlite3 database and returned `{ ok: 1 }`.
- `pnpm spike:x402` fetched the live `/supported` response and constructed the x402 buyer and Express resource server.
- A local Express smoke test returned HTTP 402 with a package-generated V2 `exact` challenge for the pinned devnet network, USDC mint, 1,000 base units, and fixed recipient.
- The Agents SDK constructs an OpenAI-compatible Chat Completions model for Groq's free `openai/gpt-oss-20b`; provider creation is locally tested without a network call. Groq documents tool use for this model. A credentialed inference remains unverified until `.env` is filled.
- `pnpm test` passes 71 policy, ledger, wallet, funding, purchase, transport, routing, provider, orchestrator, readiness, and dashboard-view-model tests.
- `pnpm typecheck` and `pnpm build` complete successfully.

## Sources

- https://solana.com/docs/payments/agentic-payments/x402
- https://solana.com/docs/tools/x402-facilitator
- https://solana.com/docs/clients/official/javascript
- https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md
- https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md
- https://faucet.circle.com/?chain=SOL
- https://developers.openai.com/api/docs/guides/agents/orchestration
- https://openai.github.io/openai-agents-js/guides/models/
- https://console.groq.com/docs/model/openai/gpt-oss-20b
- https://console.groq.com/docs/rate-limits
- https://docs.typesafe.ai/sdk/javascript
