# Encrypted Task Signer Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every disposable task's Solana signing seed across local process restarts while keeping raw key bytes out of SQLite, API responses, logs, and Git.

**Architecture:** A focused crypto module encrypts 32-byte signer seeds with AES-256-GCM, a random 96-bit IV, and task-ID additional authenticated data. `TaskAccountStore` stores public task metadata plus ciphertext in SQLite and reconstructs a non-extractable Solana signer only inside the backend purchase path.

**Tech Stack:** TypeScript, Node.js `crypto`, `better-sqlite3`, Solana Kit 5.5.1, Vitest.

## Global Constraints

- Devnet only; stored task accounts must use `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` and the configured devnet USDC mint.
- Never return, log, commit, or render a signer seed, encryption key, IV/tag bundle, or decrypted key material.
- `PACTLET_SIGNER_MASTER_KEY` is a server-only base64url-encoded 32-byte key.
- Bind ciphertext to the task ID with AES-GCM additional authenticated data so records cannot be swapped between tasks.
- This is an encrypted local hackathon vault, not a production KMS, HSM, or trustless custody design.
- Preserve `new TaskAccountStore()` as an in-memory test/local primitive; live API task creation fails closed without persistent store configuration.

---

### Task 1: Authenticated signer-seed encryption

**Files:**
- Create: `src/solana/task-signer-vault.ts`
- Test: `src/solana/task-signer-vault.test.ts`

**Interfaces:**
- Produces: `parseSignerMasterKey(value: string): Uint8Array`
- Produces: `encryptSignerSeed(input): EncryptedSignerSeed`
- Produces: `decryptSignerSeed(input): Uint8Array`

- [x] **Step 1: Write focused failing tests**

Test a valid 32-byte base64url key, invalid/missing keys, round-trip encryption, different ciphertext for repeated encryption, task-ID mismatch, ciphertext tampering, and authentication-tag tampering.

- [x] **Step 2: Run test to verify RED**

Run: `pnpm vitest run src/solana/task-signer-vault.test.ts`

Expected: FAIL because `./task-signer-vault` does not exist.

- [x] **Step 3: Implement the minimal crypto module**

Use `createCipheriv("aes-256-gcm", key, randomBytes(12))`, `cipher.setAAD(Buffer.from(taskId))`, and a 16-byte authentication tag. Decode configuration with `Buffer.from(value, "base64url")` and reject non-canonical encodings or decoded lengths other than 32 bytes.

- [x] **Step 4: Run focused test to verify GREEN**

Run: `pnpm vitest run src/solana/task-signer-vault.test.ts`

Expected: all vault tests PASS.

### Task 2: SQLite-backed task accounts

**Files:**
- Modify: `src/solana/task-accounts.ts`
- Modify: `src/solana/task-accounts.test.ts`

**Interfaces:**
- Produces: `TaskAccountStore.open(path, masterKey): TaskAccountStore`
- Changes: `signer(taskId): Promise<KeyPairSigner>`
- Produces: `close(): void`

- [x] **Step 1: Add a restart-persistence test**

Create a store on a temporary SQLite path, create and fund a task, close it, reopen with the same key, and assert the public record, funding signature, signer address, network, mint, and allocation are unchanged. Also assert that the database bytes do not contain the raw 32-byte seed representation and a different master key cannot decrypt the signer.

- [x] **Step 2: Run test to verify RED**

Run: `pnpm vitest run src/solana/task-accounts.test.ts`

Expected: FAIL because the current store only uses process-local maps.

- [x] **Step 3: Implement the SQLite store**

Generate each seed with `randomBytes(32)`, import it with `createKeyPairSignerFromPrivateKeyBytes`, encrypt it before insertion, and store only ciphertext/IV/tag plus public metadata. On `signer`, decrypt, import, verify the reconstructed public address equals the stored address, and return the non-extractable signer.

- [x] **Step 4: Run focused tests to verify GREEN**

Run: `pnpm vitest run src/solana/task-signer-vault.test.ts src/solana/task-accounts.test.ts src/solana/funding-transaction.test.ts`

Expected: all signer, account, and funding tests PASS.

### Task 3: Runtime and purchase integration

**Files:**
- Modify: `src/auth/store.ts`
- Modify: `src/payments/purchase-service.ts`
- Modify: `src/payments/purchase-service.test.ts`
- Modify: `app/api/tasks/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `assertTaskAccountStoreConfigured(): void`
- Changes: `signerForTask(taskId): KeyPairSigner | Promise<KeyPairSigner>`

- [x] **Step 1: Write failing runtime and async-signer tests**

Assert missing/invalid vault configuration fails with `TASK_SIGNER_NOT_CONFIGURED`, valid configuration reopens the requested database, and `PurchaseService` awaits an asynchronous signer provider before calling the x402 transport.

- [x] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run src/auth/store.test.ts src/payments/purchase-service.test.ts`

Expected: FAIL until runtime configuration and async signer support exist.

- [x] **Step 3: Integrate the persistent store**

Open the task store from `PACTLET_DATABASE_PATH` and `PACTLET_SIGNER_MASTER_KEY`. Keep the browser-only simulation independent, return HTTP 503 from live task creation when the vault is unavailable, and await the task signer immediately before transport signing.

- [x] **Step 4: Document configuration**

Add a blank `PACTLET_SIGNER_MASTER_KEY=` to `.env.example` with a local generation command and no real value. Update security and roadmap documents to distinguish encrypted local storage from production KMS.

- [x] **Step 5: Run all repository gates**

Run: `pnpm test && pnpm typecheck && pnpm build && git diff --check`

Expected: zero failed tests, successful typecheck/build, and no whitespace errors.

- [x] **Step 6: Commit**

```bash
git add .env.example app/api/tasks/route.ts src/auth/store.ts \
  src/payments/purchase-service.ts src/payments/purchase-service.test.ts \
  src/solana/task-accounts.ts src/solana/task-accounts.test.ts \
  src/solana/task-signer-vault.ts src/solana/task-signer-vault.test.ts \
  docs/security.md docs/roadmap.md docs/superpowers/plans/2026-10-13-encrypted-task-signer-vault.md
git commit -m "feat: persist encrypted task signers"
```
