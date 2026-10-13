# Stateless Wallet Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace process-local wallet nonce and session maps with signed, expiring tokens that survive serverless cold starts without storing wallet credentials.

**Architecture:** A pure Node.js crypto module signs wallet challenges and session claims with HMAC-SHA256. The wallet still proves ownership with an Ed25519 message signature; API routes read the signing secret lazily so the public simulated demo can build without live-mode credentials.

**Tech Stack:** TypeScript, Node.js `crypto`, Solana Kit address codecs, Next.js 16 Route Handlers, Vitest.

## Global Constraints

- Devnet only; authentication must not introduce any mainnet path.
- Never log or return `PACTLET_SESSION_SECRET`, wallet signatures, or raw token payloads.
- `PACTLET_SESSION_SECRET` must contain at least 32 characters and remain server-only.
- Challenges expire after five minutes; sessions expire after thirty minutes.
- The live API must fail closed when the signing secret is missing or invalid.
- Preserve the existing `pactlet_session` HTTP-only, strict-SameSite cookie.

---

### Task 1: Signed wallet challenges and sessions

**Files:**
- Create: `src/auth/signed-wallet-auth.ts`
- Test: `src/auth/signed-wallet-auth.test.ts`

**Interfaces:**
- Produces: `issueWalletChallenge(input): WalletChallenge`
- Produces: `verifyWalletChallenge(input): WalletVerificationResult`
- Produces: `createSessionToken(input): string`
- Produces: `walletFromSessionToken(input): string | null`

- [x] **Step 1: Write focused failing tests**

Cover a valid wallet signature, challenge tampering, challenge expiry, a signature from another wallet, a valid session, session tampering, session expiry, and a secret shorter than 32 characters.

```ts
const challenge = issueWalletChallenge({
  address: wallet.address,
  origin: "https://pactlet.example",
  secret,
  now,
});
const signature = sign(null, Buffer.from(challenge.message), wallet.privateKey)
  .toString("base64");
expect(verifyWalletChallenge({ ...challenge, signature, origin, secret, now: now + 1 }))
  .toEqual({ ok: true });
```

- [x] **Step 2: Run the tests and verify RED**

Run: `pnpm vitest run src/auth/signed-wallet-auth.test.ts`

Expected: FAIL because `./signed-wallet-auth` does not exist.

- [x] **Step 3: Implement the minimal signed-token module**

Use canonical JSON payloads encoded with base64url and an HMAC-SHA256 signature. Compare MACs with `timingSafeEqual`, validate the configured origin and canonical Solana address, and verify the wallet's Ed25519 signature over the exact generated message.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm vitest run src/auth/signed-wallet-auth.test.ts`

Expected: all signed-wallet-auth tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/auth/signed-wallet-auth.ts src/auth/signed-wallet-auth.test.ts
git commit -m "feat: add stateless wallet auth tokens"
```

### Task 2: Route integration and fail-closed configuration

**Files:**
- Modify: `src/auth/store.ts`
- Modify: `app/api/auth/nonce/route.ts`
- Modify: `app/api/auth/verify/route.ts`
- Modify: `.env.example`
- Test: `src/auth/store.test.ts`

**Interfaces:**
- Consumes: the four pure functions from Task 1.
- Produces: `issueWalletChallenge(address, now?)`, `verifyWalletChallenge(input)`, `createWalletSession(address, now?)`, and `walletForSession(token, now?)` wrappers that read server-only configuration lazily.

- [x] **Step 1: Write a failing configuration test**

Assert that missing or short `PACTLET_SESSION_SECRET` produces `AUTH_NOT_CONFIGURED`, while a valid secret allows a token created by one wrapper call to be verified by a fresh wrapper call without shared memory.

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run src/auth/store.test.ts`

Expected: FAIL because the current store relies on in-memory maps.

- [x] **Step 3: Replace process-local auth maps**

Remove `WalletNonceStore` and `walletSessions` from `src/auth/store.ts`. Read `PACTLET_SESSION_SECRET` only inside auth functions. Update the nonce and verify routes to return HTTP 503 with `AUTH_NOT_CONFIGURED` when the secret is unavailable, without exposing configuration details.

- [x] **Step 4: Document the environment variable**

Add `PACTLET_SESSION_SECRET=` to `.env.example` with a server-only, minimum-32-character description. Do not generate or commit a real value.

- [x] **Step 5: Verify the auth and existing suites**

Run: `pnpm vitest run src/auth/signed-wallet-auth.test.ts src/auth/store.test.ts src/auth/wallet-nonce.test.ts`

Expected: all auth tests PASS after replacing obsolete nonce-store expectations with signed-challenge expectations.

- [x] **Step 6: Run repository gates**

Run: `pnpm test && pnpm typecheck && pnpm build && git diff --check`

Expected: zero failed tests, successful typecheck/build, and no whitespace errors.

- [x] **Step 7: Update the roadmap and security boundary**

Document that nonce/session state is now cryptographically verifiable across cold starts, challenge replay remains bounded by its five-minute expiry, and task signer plus ledger durability are still open.

- [x] **Step 8: Commit**

```bash
git add .env.example app/api/auth/nonce/route.ts app/api/auth/verify/route.ts \
  src/auth/store.ts src/auth/store.test.ts src/auth/wallet-nonce.test.ts \
  docs/security.md docs/roadmap.md
git commit -m "feat: make wallet auth serverless-safe"
```
