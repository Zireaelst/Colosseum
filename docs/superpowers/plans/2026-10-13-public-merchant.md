# Public x402 Merchant Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the demo merchant safe to run on a public Node host while refusing to start unless the facilitator currently advertises x402 V2 Solana devnet `exact`.

**Architecture:** A pure configuration module validates host, port, recipient, facilitator URL, and the live `/supported` payload. The Express entry point awaits the gate before listening and supports platform-provided `PORT` plus an explicit bind host.

**Tech Stack:** TypeScript, Express 5, x402 2.28.0, Solana Kit 5.5.1, Vitest.

## Global Constraints

- Accept only `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`, x402 V2, and `exact`.
- Never follow redirects when checking the facilitator.
- Keep the merchant recipient fixed in server configuration.
- Default to `127.0.0.1:4021`; public hosts must explicitly use `0.0.0.0` or their platform configuration.
- Do not execute or sign a payment in these tests.

---

### Task 1: Merchant configuration and facilitator gate

**Files:**
- Create: `merchant/config.ts`
- Test: `merchant/config.test.ts`

- [x] Write failing tests for valid configuration, platform `PORT`, invalid recipient, unsupported network/scheme/version, redirects, and non-200 facilitator responses.
- [x] Run `pnpm vitest run merchant/config.test.ts` and confirm failure because the module is missing.
- [x] Implement `readMerchantConfig(environment)` and `assertFacilitatorSupport(url, fetchImplementation)` with strict validation and a 15-second timeout.
- [x] Run the focused tests and confirm they pass.

### Task 2: Fail-closed server startup

**Files:**
- Modify: `merchant/server.ts`
- Modify: `.env.example`
- Modify: `docs/feasibility.md`
- Modify: `docs/roadmap.md`

- [x] Refactor the server to read validated configuration, await the live facilitator gate, and only then listen on the configured host and port.
- [x] Document `X402_MERCHANT_HOST` and platform `PORT` behavior without committing deployment credentials.
- [x] Run `pnpm spike:x402`, start the merchant, and inspect a package-generated 402 challenge for version, scheme, devnet network, mint, amount, and recipient.
- [x] Run `pnpm test && pnpm typecheck && pnpm build && git diff --check`.
- [x] Record the verified merchant boundary and commit the focused change.
