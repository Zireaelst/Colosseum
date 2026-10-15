# Pactlet Complete Product Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete, responsive Pactlet public site, documentation route, and guided live-app onboarding without changing the existing payment engine.

**Architecture:** Shared site navigation, footer, brand mark, and route metadata keep the public experience consistent. The landing page is composed from server-rendered sections, while the mobile menu and wallet flow remain isolated client components. Existing brand SVGs are used as optimized static assets and existing live/demo business logic is preserved.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript 5.9, CSS, Vitest 5, existing Pactlet brand SVG assets.

## Global Constraints

- Product name is `Pactlet`; never introduce AgentPass or beeple.
- Solana devnet only; no mainnet identifiers, claims, or links.
- Policy remains backend-enforced and custodial; Solana proves only a submitted transfer/signature.
- Do not claim a real x402 settlement until an Explorer signature is verified.
- Do not add Aceternity or another runtime UI dependency for effects that can be implemented locally.
- Preserve all existing wallet, task, delegation, policy, and payment behavior.
- Never expose environment values, signer material, wallet credentials, or payment credentials.
- Deployment and push are not part of this plan.

---

### Task 1: Shared public navigation and route contract

**Files:**
- Create: `app/components/brand-mark.tsx`
- Create: `app/components/site-header.tsx`
- Create: `app/components/site-footer.tsx`
- Create: `src/ui/public-navigation.ts`
- Test: `src/ui/public-navigation.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `PUBLIC_NAV_ITEMS`, `LANDING_SECTION_IDS`, `BrandMark`, `SiteHeader`, and `SiteFooter`.
- Navigation item shape: `{ label: string; href: string }`.

- [ ] **Step 1: Write the failing navigation contract test**

```ts
import { describe, expect, it } from "vitest";
import { LANDING_SECTION_IDS, PUBLIC_NAV_ITEMS } from "./public-navigation";

describe("public navigation", () => {
  it("targets a real landing section or public route", () => {
    for (const item of PUBLIC_NAV_ITEMS) {
      if (item.href.startsWith("/#")) {
        expect(LANDING_SECTION_IDS).toContain(item.href.slice(2));
      } else {
        expect(["/docs", "/demo", "/app"]).toContain(item.href);
      }
    }
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/ui/public-navigation.test.ts`

Expected: FAIL because `src/ui/public-navigation.ts` does not exist.

- [ ] **Step 3: Implement the navigation contract and shared shell**

```ts
export const LANDING_SECTION_IDS = ["product", "how-it-works", "security"] as const;
export const PUBLIC_NAV_ITEMS = [
  { label: "Product", href: "/#product" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Security", href: "/#security" },
  { label: "Docs", href: "/docs" },
  { label: "Demo", href: "/demo" },
] as const;
```

Build `SiteHeader` as the only client component in this task. It owns mobile-menu state, Escape handling, resize-close behavior, `aria-expanded`, and body scroll restoration. `BrandMark` and `SiteFooter` remain server-safe presentational components.

- [ ] **Step 4: Run focused test and typecheck**

Run: `pnpm test src/ui/public-navigation.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/brand-mark.tsx app/components/site-header.tsx app/components/site-footer.tsx src/ui/public-navigation.ts src/ui/public-navigation.test.ts app/globals.css
git commit -m "feat: add shared Pactlet public navigation"
```

### Task 2: Complete landing product story

**Files:**
- Create: `app/components/landing/hero.tsx`
- Create: `app/components/landing/problem-section.tsx`
- Create: `app/components/landing/product-section.tsx`
- Create: `app/components/landing/how-it-works-section.tsx`
- Create: `app/components/landing/security-section.tsx`
- Create: `app/components/landing/final-cta.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `src/demo/public-demo-ui.test.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, and the section IDs from Task 1.
- Produces: a server-renderable `Home` page with all declared anchors and route CTAs.

- [ ] **Step 1: Replace the obsolete metric assertion with failing landing behavior assertions**

```tsx
it("renders a complete product story with working anchors", () => {
  const html = renderToStaticMarkup(<Home />);
  for (const id of ["product", "how-it-works", "security"]) {
    expect(html).toContain(`id="${id}"`);
  }
  expect(html).toContain('href="/app"');
  expect(html).toContain('href="/demo"');
  expect(html).toContain('href="/docs"');
  expect(html).toContain("trusted backend");
  expect(html).not.toContain("140+ tests");
  expect(html).not.toContain("cloudfront.net");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/demo/public-demo-ui.test.tsx`

Expected: FAIL because the existing page lacks the real sections and still includes the external video/obsolete metric.

- [ ] **Step 3: Compose the landing sections**

Use `/brand/hero-background.svg`, `/brand/delegation-illustration.svg`, `/brand/feature-budgets.svg`, `/brand/feature-delegation.svg`, `/brand/feature-policy.svg`, and `/brand/section-divider.svg`. Use `next/image` with explicit dimensions for content images. Keep these exact truth-boundary phrases visible: `Solana devnet`, `trusted backend`, `custodial prototype`, and `No agent-held keys`.

Remove the page-sized inline `<style>` and external video from `app/page.tsx`. Move landing styles into grouped `.landing-*` rules in `app/globals.css` and restore normal document scrolling.

- [ ] **Step 4: Run focused test and typecheck**

Run: `pnpm test src/demo/public-demo-ui.test.tsx && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/components/landing app/globals.css src/demo/public-demo-ui.test.tsx
git commit -m "feat: complete Pactlet landing product story"
```

### Task 3: Public docs quick start

**Files:**
- Create: `app/docs/page.tsx`
- Test: `src/ui/docs-page.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`.
- Produces: server-rendered `/docs` with in-page section navigation and only environment variable names.

- [ ] **Step 1: Write the failing docs truth-boundary test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DocsPage from "../../app/docs/page";

describe("docs page", () => {
  it("documents quick start without overstating enforcement", () => {
    const html = renderToStaticMarkup(<DocsPage />);
    expect(html).toContain("Quick start");
    expect(html).toContain("Solana devnet only");
    expect(html).toContain("backend-enforced");
    expect(html).toContain("Simulated demo");
    expect(html).toContain("NEXT_PUBLIC_APP_ORIGIN");
    expect(html).not.toContain("production secure");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/ui/docs-page.test.tsx`

Expected: FAIL because `app/docs/page.tsx` does not exist.

- [ ] **Step 3: Implement the docs route**

Create sections for Overview, Quick start, Live versus simulated, Runtime readiness, Trust boundary, API routes, and Limitations. Link architecture details to `https://github.com/Zireaelst/Colosseum/blob/main/docs/architecture.md`, and link devnet Explorer to `https://explorer.solana.com/?cluster=devnet`. List environment variable names only.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `pnpm test src/ui/docs-page.test.tsx src/ui/public-navigation.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/docs/page.tsx app/globals.css src/ui/docs-page.test.tsx
git commit -m "feat: add Pactlet public quick-start docs"
```

### Task 4: Guided live-app progress and coherent public shells

**Files:**
- Create: `app/components/app-progress.tsx`
- Test: `src/ui/app-progress.test.tsx`
- Modify: `app/wallet-connect.tsx`
- Modify: `app/app/page.tsx`
- Modify: `app/demo/page.tsx`
- Modify: `app/components/task-dashboard.tsx`
- Modify: `app/components/public-demo.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getAppProgress({ walletVerified, taskCreated, fundingState }): { activeStep: 1 | 2 | 3; completedSteps: number[] }` and `AppProgress`.
- Consumes: existing wallet/task/funding state without changing API contracts.

- [ ] **Step 1: Write the failing progress-state test**

```ts
import { describe, expect, it } from "vitest";
import { getAppProgress } from "../../app/components/app-progress";

describe("live app progress", () => {
  it.each([
    [{ walletVerified: false, taskCreated: false, fundingState: "idle" }, 1],
    [{ walletVerified: true, taskCreated: false, fundingState: "idle" }, 2],
    [{ walletVerified: true, taskCreated: true, fundingState: "idle" }, 2],
    [{ walletVerified: true, taskCreated: true, fundingState: "confirmed" }, 3],
  ] as const)("derives the active step", (state, expected) => {
    expect(getAppProgress(state).activeStep).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/ui/app-progress.test.tsx`

Expected: FAIL because the progress module does not exist.

- [ ] **Step 3: Implement progress UI and shared shells**

Render progress above wallet content and update it from the existing `connectedAccount`, `task`, and `fundingState`. Use `SiteHeader`/`SiteFooter` on app and demo pages. Keep the demo banner text `Simulated` and `No transaction was signed or broadcast.` Keep live app funding state `confirming` after a submitted-but-unconfirmed transaction.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `pnpm test src/ui/app-progress.test.tsx src/demo/public-demo-ui.test.tsx && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/app-progress.tsx app/wallet-connect.tsx app/app/page.tsx app/demo/page.tsx app/components/task-dashboard.tsx app/components/public-demo.tsx app/globals.css src/ui/app-progress.test.tsx
git commit -m "feat: guide users through Pactlet live app"
```

### Task 5: Accessibility, responsive polish, and release verification

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/demo.md`

**Interfaces:**
- Consumes: all routes produced by Tasks 1–4.
- Produces: production-build-ready frontend and updated documentation of real versus simulated boundaries.

- [ ] **Step 1: Add failing public-page regression assertions**

Extend `src/demo/public-demo-ui.test.tsx` to assert a skip link, one primary `h1` per public page, visible `Devnet only` labeling on the live app, and `Simulated` labeling on the demo.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/demo/public-demo-ui.test.tsx`

Expected: FAIL on at least the missing skip-link contract.

- [ ] **Step 3: Finish accessibility and responsive CSS**

Add `:focus-visible`, `.skip-link`, `scroll-margin-top`, 320px layout safeguards, long-code wrapping, `prefers-reduced-motion`, and high-contrast status states. Update metadata to describe the complete public product accurately.

- [ ] **Step 4: Update project documentation**

Record the four public routes, the landing/docs completion status, the simulated demo boundary, and that real devnet/x402 evidence is still deferred. Do not mark M3 complete without a verified signature.

- [ ] **Step 5: Run full verification**

Run: `pnpm test && pnpm typecheck && pnpm build`

Expected: all tests pass, TypeScript exits 0, and the Next.js production build exits 0.

- [ ] **Step 6: Perform one visual QA pass**

Inspect `/`, `/docs`, `/app`, and `/demo` at desktop and mobile widths. Do not record video. Confirm no horizontal overflow, dead links, hidden controls, clipped addresses, or false claims.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx README.md docs/roadmap.md docs/demo.md src/demo/public-demo-ui.test.tsx
git commit -m "docs: finish Pactlet public frontend handoff"
```
