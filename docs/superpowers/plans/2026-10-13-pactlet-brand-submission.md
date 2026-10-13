# Pactlet Brand and Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the tested MVP under the Pactlet name with a Turkish Colosseum submission script and coherent git history.

**Architecture:** Apply a complete repository-level identifier and copy rename without altering policy or payment behavior. Keep the submission copy in one standalone document and preserve honest labels for backend enforcement and pending onchain evidence.

**Tech Stack:** Next.js 16.4, TypeScript 5.9, Vitest 5, OpenAI Agents SDK, Solana Kit, x402 V2, SQLite, Markdown, git.

**Status:** Implemented. Pactlet branding, Turkish submission copy, landing page, `/app` shell, tests, typecheck, and production build are verified; real devnet settlement remains a separate live-evidence gate.

## Global Constraints

- Solana devnet only; no mainnet configuration or funds.
- The final product name is `pactlet`; do not use `AgentPass` as the project name.
- No secret or signer material may be committed.
- No claim of onchain-enforced delegation or completed settlement without an Explorer signature.
- Push only after fresh tests, typecheck, build, diff, secret, and former-brand scans pass.

---

### Task 1: Preserve the MVP as coherent history

**Files:** Existing application, server, test, merchant, and documentation files.

**Interfaces:** Each commit groups one reviewable concern: toolchain, policy, ledger, authentication, Solana funding, x402 transport, agent runtime, APIs, dashboard, and docs.

- [ ] Stage only the files for one concern.
- [ ] Inspect `git diff --cached --stat` and `git diff --cached --check`.
- [ ] Commit with a conventional, descriptive message.
- [ ] Repeat until every existing MVP concern is represented without empty or padding commits.

### Task 2: Rename runtime and product identifiers

**Files:** `package.json`, `pnpm-lock.yaml`, `.env.example`, `AGENTS.md`, `app/**`, `src/**`, `merchant/server.ts`, `scripts/spike/x402-compatibility.ts`, `README.md`, `docs/**`.

**Interfaces:** Produce `pactlet_session`, `PACTLET_DATABASE_PATH`, `buildPactletAgentGraph()`, and `runPactletManager()`.

- [ ] Update tests first to expect Pactlet-facing names and imports.
- [ ] Run focused agent and authentication tests and confirm the old exports fail.
- [ ] Rename implementation identifiers and all product copy.
- [ ] Scan case-insensitively for the former working name excluding `.git`, dependencies, and build output; expect no matches.
- [ ] Run the focused tests again; expect all to pass.

### Task 3: Add the Turkish submission package

**Files:** Create `docs/submission-tr.md`; modify `README.md` and `docs/roadmap.md`.

**Interfaces:** Produce a sub-two-minute pitch, sub-three-minute demo, exactly three business-model sentences, and the two-destination submission checklist.

- [ ] Write founder-voice Turkish copy using only verified claims.
- [ ] Add timing labels whose totals stay within the video limits.
- [ ] Link the submission document from README.
- [ ] Record the Pactlet rename and submission readiness in the roadmap.

### Task 4: Verify and push

**Files:** Entire repository.

**Interfaces:** A clean tested commit series on `origin/main`.

- [ ] Run `pnpm test`; expect 71 passing tests.
- [ ] Run `pnpm typecheck`; expect exit code 0.
- [ ] Run `pnpm build`; expect exit code 0.
- [ ] Run `git diff --check` and secret/former-brand scans; expect no findings.
- [ ] Inspect the final commit series and push `main` to `origin`.
