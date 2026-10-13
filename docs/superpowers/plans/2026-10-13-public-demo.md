# Pactlet Public Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reliable, browser-only Pactlet walkthrough on Vercel while keeping the existing wallet-backed devnet flow visibly separate.

**Architecture:** A pure reducer owns deterministic public-demo state and is rendered by a dedicated client component. `/app` switches between the public simulation and the existing live-devnet component without sending public-demo actions to an API.

**Tech Stack:** TypeScript, React 19, Next.js 16.4, Vitest 5, Vercel.

## Global Constraints

- Devnet only; never create or display a fake Solana signature.
- Every simulated result must be labeled `SIMULATED`.
- Keep `.env`, signer bytes, and API keys out of Git and deployment logs.
- Preserve the existing local wallet and x402 path without claiming it is durable on Vercel.
- Use integer token base units for every budget calculation.

---

### Task 1: Deterministic public-demo state machine

**Files:**
- Create: `src/demo/public-demo.ts`
- Test: `src/demo/public-demo.test.ts`

**Interfaces:**
- Produces: `createPublicDemoState(): PublicDemoState`
- Produces: `reducePublicDemo(state, action): PublicDemoState`
- Produces: `PublicDemoAction` for `allow_purchase`, `reject_over_budget`, `cancel_research`, `reject_after_cancel`, and `reset`.

- [x] **Step 1: Write the failing reducer tests**

Cover initial 10/4/3 allocations, a 1,000-base-unit research settlement, an over-budget rejection that leaves budget unchanged, cancellation, a post-cancel rejection, and reset.

```ts
const initial = createPublicDemoState();
expect(initial.delegations.map(({ allocation, available }) => [allocation, available]))
  .toEqual([[10_000_000n, 3_000_000n], [4_000_000n, 4_000_000n], [3_000_000n, 3_000_000n]]);

const paid = reducePublicDemo(initial, { type: "allow_purchase" });
expect(paid.delegations[1]?.available).toBe(3_999_000n);
expect(paid.payments.at(-1)).toMatchObject({ state: "settled", simulated: true });

const rejected = reducePublicDemo(paid, { type: "reject_over_budget" });
expect(rejected.delegations[1]?.available).toBe(3_999_000n);
expect(rejected.payments.at(-1)).toMatchObject({ rejectionCode: "BUDGET_EXCEEDED" });

const cancelled = reducePublicDemo(rejected, { type: "cancel_research" });
expect(cancelled.delegations[0]?.available).toBe(6_999_000n);
expect(cancelled.delegations[1]?.status).toBe("cancelled");

const blocked = reducePublicDemo(cancelled, { type: "reject_after_cancel" });
expect(blocked.payments.at(-1)).toMatchObject({ rejectionCode: "AUTHORITY_CANCELLED" });
expect(reducePublicDemo(blocked, { type: "reset" })).toEqual(initial);
```

- [x] **Step 2: Verify the tests fail for the missing module**

Run: `pnpm vitest run src/demo/public-demo.test.ts`

Expected: FAIL because `./public-demo` does not exist.

- [x] **Step 3: Implement the minimal pure reducer**

Use immutable state objects and append deterministic event/payment records. Derive available amounts as allocation minus settled spending and active child allocations.

```ts
export type PublicDemoAction =
  | { type: "allow_purchase" }
  | { type: "reject_over_budget" }
  | { type: "cancel_research" }
  | { type: "reject_after_cancel" }
  | { type: "reset" };

export function createPublicDemoState(): PublicDemoState;
export function reducePublicDemo(
  state: PublicDemoState,
  action: PublicDemoAction,
): PublicDemoState;
```

- [x] **Step 4: Verify reducer tests pass**

Run: `pnpm vitest run src/demo/public-demo.test.ts`

Expected: all public-demo tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/demo/public-demo.ts src/demo/public-demo.test.ts
git commit -m "feat: add deterministic public demo state"
```

### Task 2: Public demo interface and mode switch

**Files:**
- Create: `app/components/public-demo.tsx`
- Modify: `app/app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `createPublicDemoState()` and `reducePublicDemo()` from Task 1.
- Produces: `PublicDemo` client component with guided actions and clear simulation labels.
- Produces: `DemoModes` client component that defaults to Public Demo and reveals `WalletConnect` only under Live Devnet.

- [x] **Step 1: Add a focused source-level UI test**

Assert that the app defaults to the public demo, includes the `SIMULATED` disclosure, and labels Live Devnet as local/single-process.

```tsx
const html = renderToStaticMarkup(<DemoModes />);
expect(html).toContain("Public Demo");
expect(html).toContain("SIMULATED");
expect(html).toContain("Live Devnet");
expect(html).toContain("single-process");
```

- [x] **Step 2: Verify the UI test fails before components exist**

Run: `pnpm vitest run src/demo/public-demo-ui.test.ts`

Expected: FAIL for missing public-demo component/copy.

- [x] **Step 3: Implement the public dashboard and guided buttons**

Render task budget, the manager/research/analysis tree, policy events, payment rows, and reset. Disable actions already completed and do not render an Explorer link for simulated results.

```tsx
export function PublicDemo() {
  const [state, dispatch] = useReducer(reducePublicDemo, undefined, createPublicDemoState);
  return <section aria-label="Simulated policy walkthrough">{/* task, tree, actions, events */}</section>;
}
```

- [x] **Step 4: Add the mode switch and hosted limitation copy**

Default to Public Demo. Show the existing wallet component only after the user selects Live Devnet, with a warning that hosted durable storage and a public merchant are still backlog items.

```tsx
export function DemoModes() {
  const [mode, setMode] = useState<"public" | "live">("public");
  return mode === "public" ? <PublicDemo /> : <WalletConnect />;
}
```

- [x] **Step 5: Add responsive styles and verify focused tests**

Run: `pnpm vitest run src/demo/public-demo.test.ts src/demo/public-demo-ui.test.ts`

Expected: all focused tests PASS.

- [x] **Step 6: Commit**

```bash
git add app/app/page.tsx app/components/public-demo.tsx app/globals.css src/demo/public-demo-ui.test.ts
git commit -m "feat: ship public Pactlet walkthrough"
```

### Task 3: Documentation, verification, and production deployment

**Files:**
- Modify: `README.md`
- Modify: `docs/demo.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Documents: exact public-simulation versus local-live boundary and hosted-MVP backlog.

- [x] **Step 1: Update public-demo documentation**

Document `/app` modes, keep the real-settlement limitation explicit, and link the approved hosted-MVP backlog.

- [x] **Step 2: Run repository verification**

Run: `pnpm test && pnpm typecheck && pnpm build && git diff --check`

Expected: zero failed tests, successful typecheck/build, and no whitespace errors.

- [x] **Step 3: Scan for secret and naming regressions**

Run tracked-file scans for private-key material, API-key assignments, `AgentPass`, and `beeple`; expect no matches.

- [x] **Step 4: Commit and push**

```bash
git add README.md docs/demo.md docs/roadmap.md
git commit -m "docs: separate public simulation from live devnet"
git push origin main
```

- [x] **Step 5: Deploy and verify**

Deploy production with `.vercelignore` intact. Verify `/` and `/app` return HTTP 200, Vercel SSO protection remains disabled, and a browser can click `Launch demo` then complete the simulated allow/reject/cancel sequence without console errors.

Result: 79 tests, typecheck, and production build passed. The production browser completed all four public-demo actions with no console errors and no Explorer transaction link.
