# Free AI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect beeple's manager/specialists to a free Groq-hosted model and turn the current page into a clear backend-driven demo dashboard.

**Architecture:** A server-only provider factory injects an OpenAI-compatible Chat Completions model into every Agents SDK agent. The UI consumes normalized task/run APIs through small React presentation components; all payment authority stays in the backend runtime context.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 5.9, OpenAI Agents SDK 0.20, Groq OpenAI-compatible API, Vitest 5, existing CSS.

**Status:** Implemented and verified on 13 October 2026. The UI was kept in one cohesive dashboard component instead of three extra presentation files to minimize deadline risk.

## Global Constraints

- Solana devnet only; no mainnet or real-value funds.
- `beeple` remains a placeholder project name; never use AgentPass as the project name.
- No API key, signer bytes, wallet sessions, or raw provider errors may reach the client or logs.
- No new UI framework or broad dependency expansion.
- The missing-key mode must be labeled `demo-fallback` and must not call the purchase function.
- Agent identity, service, URL, amount, and signer come only from server runtime context.

---

### Task 1: Server-only free model provider

**Files:**
- Create: `src/agents/model-provider.ts`
- Create: `src/agents/model-provider.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `readAIProviderConfig(env): AIProviderConfig | null`.
- Produces `createAIModel(config): Model` using `OpenAIProvider({ useResponses: false })`.

- [x] Write tests proving Groq defaults, explicit override support, and `null` without `AI_API_KEY`.
- [x] Run `pnpm vitest run src/agents/model-provider.test.ts` and verify the missing module failure.
- [x] Implement the provider configuration and model factory.
- [x] Re-run the focused test and `pnpm typecheck`.

### Task 2: Inject the provider into manager and specialists

**Files:**
- Create: `src/agents/orchestrator.test.ts`
- Modify: `src/agents/orchestrator.ts`
- Modify: `app/api/tasks/[id]/run/route.ts`

**Interfaces:**
- `runBeepleManager` returns `{ routing, executionMode, provider, model, output }`.
- It accepts an injected `runAgent` for tests and never purchases in `demo-fallback` or `uncertain` mode.

- [x] Write failing tests for no-key fallback and injected provider execution.
- [x] Run the focused test and confirm the expected assertions fail.
- [x] Refactor construction so manager and both specialist agents use the same concrete provider model.
- [x] Normalize provider errors without returning secrets or raw response bodies.
- [x] Run agent tests and typecheck.

### Task 3: Backend-driven dashboard components

**Files:**
- Create: `app/components/task-dashboard.tsx`
- Create: `app/components/delegation-tree.tsx`
- Create: `app/components/agent-console.tsx`
- Create: `app/components/activity-feed.tsx`
- Create: `src/ui/task-view-model.ts`
- Create: `src/ui/task-view-model.test.ts`
- Modify: `app/wallet-connect.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `toTaskViewModel(snapshot)` converts base-unit strings into display-safe values and Explorer URLs.
- Presentation components receive data/callback props and never call privileged APIs directly except the console's passed handler.

- [x] Write failing view-model tests for 10/4/3 allocations, pending/rejected/settled labels, and Explorer URLs.
- [x] Run the focused test and verify failure.
- [x] Implement the view-model and cohesive dashboard presentation component.
- [x] Make the agent prompt editable and display routing source, execution mode, model, output, and payment state.
- [x] Preserve exact pre-transfer preview and responsive layout.
- [x] Run focused tests and typecheck.

### Task 4: Readiness and final documentation

**Files:**
- Modify: `app/api/tasks/[id]/route.ts`
- Modify: `README.md`
- Modify: `docs/demo.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Task snapshot adds boolean readiness only: `{ ai, jev, merchant, rpc }`; it never exposes values.

- [x] Add a failing unit test for readiness derivation in a server-only helper.
- [x] Implement boolean readiness and render it as honest status chips.
- [x] Document Groq setup, free-tier limits, fallback behavior, and exact local commands.
- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`, and the secret scan.
