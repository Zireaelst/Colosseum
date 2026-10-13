# beeple free AI and dashboard design

## Goal

Finish the local hackathon MVP without requiring credentials during development. When credentials are added later, Groq's free plan serves `openai/gpt-oss-20b` through the OpenAI-compatible Chat Completions API and the existing OpenAI Agents SDK manager/specialist graph.

## AI provider boundary

Create one server-only provider configuration module. It reads `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`; defaults the URL to `https://api.groq.com/openai/v1` and model to `openai/gpt-oss-20b`; and constructs an Agents SDK `OpenAIProvider` with `useResponses: false`. No key is exposed to React or returned by an API.

Without a key, agent execution returns an explicit `demo-fallback` result and never calls the purchase function. Jev routing remains separate: TypeSafe/Jev classifies only `research`, `analysis`, or `uncertain`. Low confidence remains non-paying.

## Backend-to-frontend flow

The authenticated task API remains the source of truth. The run API returns a normalized object with routing source, route, AI execution mode, human-readable output, and current task snapshot. The browser sends only the prompt and idempotency key; agent identity, delegation, merchant URL, amount, and signer remain server-owned.

## Interface

Keep the existing visual language and avoid a new UI framework. Split the current wallet component into focused pieces:

- task setup and funding preview;
- delegation tree with allocation/available budget;
- agent console with editable prompt and run state;
- payment/event timeline with rejection reason and Explorer links;
- environment readiness labels for AI, Jev, merchant, RPC, and wallet.

The interface must remain usable without environment credentials. It labels simulated/deterministic behavior and never shows a successful payment unless the ledger has a confirmed settlement signature.

## Errors and safety

Provider errors become a concise server-safe response; no credential, raw provider body, or stack trace reaches the browser. A model cannot choose a URL, amount, delegation, service, or signer. A provider timeout does not alter payment settlement semantics. x402 pending reconciliation remains keyed by the original purchase key and stored transaction signature.

## Verification

Tests cover provider configuration defaults, missing-key fallback, provider injection, normalized agent result, and frontend view-model formatting. Final gates are `pnpm test`, `pnpm typecheck`, `pnpm build`, secret scan, and `git diff --check`. Live AI and onchain execution remain explicitly unverified until the user supplies local environment values and approves a devnet funding transaction.
