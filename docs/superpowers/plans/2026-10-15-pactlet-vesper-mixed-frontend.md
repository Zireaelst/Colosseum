# Pactlet Vesper-Mixed Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Pactlet's landing, live app, simulated demo, and docs as one responsive Vesper-inspired experience while preserving Pactlet's lime/violet identity and all working product behavior.

**Architecture:** Shared header, footer, visual tokens, and page-shell classes provide the common brand. The landing remains server-renderable and owns one decorative remote video; the live app keeps its existing client state and API contracts. Tests assert route semantics, truthful claims, branding, and the video fallback before visual code changes.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript 5.9, CSS, Vitest 5, existing Pactlet SVG assets.

## Global Constraints

- Product name is `Pactlet`; user-facing output must not introduce Vesper, beeple, or AgentPass.
- Solana devnet only; no mainnet links, RPCs, mints, or claims.
- Policy is backend-enforced; Solana proves only a submitted transfer and signature.
- Preserve wallet, task, delegation, reservation, settlement, persistence, and payment behavior.
- Do not invent traction, customer, revenue, uptime, savings, or production-security claims.
- The supplied remote video is decorative progressive enhancement with a complete SVG/gradient fallback.
- Respect reduced motion, keyboard navigation, visible focus, and 320px layouts.

---

### Task 1: Landing hero contract and cinematic shell

**Files:**
- Modify: `app/components/landing/hero.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `src/demo/public-demo-ui.test.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, existing landing sections, `/brand/hero-background.svg`.
- Produces: a decorative `<video>` with fallback poster, Pactlet-only copy, `/app` and `/demo` CTAs, and three factual boundary labels.

- [ ] **Step 1: Write the failing hero contract test**

```tsx
const html = renderToStaticMarkup(<Home />);
expect(html).toContain("<video");
expect(html).toContain("hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4");
expect(html).toContain('poster="/brand/hero-background.svg"');
expect(html).toContain("Pre-signature policy");
expect(html).toContain("Solana devnet receipts");
expect(html).not.toContain("Vesper");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run src/demo/public-demo-ui.test.tsx`

Expected: FAIL because the landing has no video or new boundary labels.

- [ ] **Step 3: Implement the cinematic hero**

Add a muted, looped, autoplay, inline, assistive-technology-hidden video with `preload="metadata"` and `poster="/brand/hero-background.svg"`. Keep the fallback `Image`, add black/lime/violet scrims, bottom-center the copy, and replace the sample card with three honest proof labels. Preserve all below-hero landing sections.

- [ ] **Step 4: Verify focused tests and typecheck**

Run: `pnpm exec vitest run src/demo/public-demo-ui.test.tsx && pnpm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/landing/hero.tsx app/page.tsx app/globals.css src/demo/public-demo-ui.test.tsx
git commit -m "feat: rebuild Pactlet cinematic landing hero"
```

### Task 2: Shared metallic navigation and brand system

**Files:**
- Modify: `app/components/site-header.tsx`
- Modify: `app/components/site-footer.tsx`
- Modify: `app/components/brand-mark.tsx`
- Modify: `app/globals.css`
- Test: `src/ui/public-navigation.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_NAV_ITEMS` and existing route links.
- Produces: metallic desktop pills, lime CTA, full-screen mobile menu, shared page/footer styling, and unchanged keyboard/menu behavior.

- [ ] **Step 1: Write the failing branding/navigation test**

```tsx
const html = renderToStaticMarkup(<SiteHeader />);
expect(html).toContain("Pactlet");
expect(html).toContain("public-nav-link");
expect(html).toContain("public-header-cta");
expect(html).not.toContain("Vesper");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run src/ui/public-navigation.test.ts`

Expected: FAIL because navigation links do not expose the shared pill class contract.

- [ ] **Step 3: Implement the shared visual shell**

Give every nav link `public-nav-link`, retain `aria-expanded`, Escape and resize handling, and link-close behavior. Replace old midnight tokens with black, lime, violet, white, metallic, and glass tokens. Use the same actions, focus states, radius language, and footer treatment across routes.

- [ ] **Step 4: Verify focused tests and typecheck**

Run: `pnpm exec vitest run src/ui/public-navigation.test.ts src/demo/public-demo-ui.test.tsx && pnpm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/site-header.tsx app/components/site-footer.tsx app/components/brand-mark.tsx app/globals.css src/ui/public-navigation.test.ts
git commit -m "feat: unify Pactlet metallic public shell"
```

### Task 3: Live app, demo, and docs visual unification

**Files:**
- Modify: `app/app/page.tsx`
- Modify: `app/demo/page.tsx`
- Modify: `app/docs/page.tsx`
- Modify: `app/wallet-connect.tsx`
- Modify: `app/components/task-dashboard.tsx`
- Modify: `app/components/public-demo.tsx`
- Modify: `app/components/app-progress.tsx`
- Modify: `app/globals.css`
- Test: `src/demo/public-demo-ui.test.tsx`
- Test: `src/ui/docs-page.test.tsx`

**Interfaces:**
- Consumes: existing wallet/task/funding state, `PublicDemo`, `AppProgress`, and shared shell.
- Produces: `operator-page`, `operator-hero`, and `operator-panel` semantic styling hooks without API or state-machine changes.

- [ ] **Step 1: Write failing cross-route shell assertions**

```tsx
for (const page of [<PactletApp />, <DemoPage />, <DocsPage />]) {
  const html = renderToStaticMarkup(page);
  expect(html).toContain("product-page-shell");
  expect(html).toContain("Pactlet");
  expect(html).not.toContain("Vesper");
}
expect(renderToStaticMarkup(<DemoPage />)).toContain("SIMULATED");
expect(renderToStaticMarkup(<PactletApp />)).toContain("Devnet only");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vitest run src/demo/public-demo-ui.test.tsx src/ui/docs-page.test.tsx`

Expected: FAIL because docs does not yet share the unified product page shell.

- [ ] **Step 3: Implement route unification**

Apply the shared operator shell to app, demo, and docs; restyle cards, steps, timeline, code rows, wallet controls, budget tree, events, errors, and Explorer links. Do not rename runtime state, change requests, or change live/simulated copy boundaries.

- [ ] **Step 4: Verify focused tests and typecheck**

Run: `pnpm exec vitest run src/demo/public-demo-ui.test.tsx src/ui/docs-page.test.tsx src/ui/app-progress.test.tsx && pnpm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/app/page.tsx app/demo/page.tsx app/docs/page.tsx app/wallet-connect.tsx app/components/task-dashboard.tsx app/components/public-demo.tsx app/components/app-progress.tsx app/globals.css src/demo/public-demo-ui.test.tsx src/ui/docs-page.test.tsx
git commit -m "feat: unify Pactlet product surfaces"
```

### Task 4: Responsive, accessibility, and release verification

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `README.md`
- Modify: `docs/demo.md`
- Test: `src/demo/public-demo-ui.test.tsx`

**Interfaces:**
- Consumes: every route and shared component from Tasks 1–3.
- Produces: responsive and reduced-motion-safe release candidate with accurate metadata and docs.

- [ ] **Step 1: Add the failing final regression assertions**

```tsx
const home = renderToStaticMarkup(<Home />);
expect(home).toContain("skip-link");
expect(home.match(/<h1/g)).toHaveLength(1);
expect(home).toContain('preload="metadata"');
expect(home).not.toContain("180+");
expect(home).not.toContain("92%");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run src/demo/public-demo-ui.test.tsx`

Expected: FAIL until the final video/performance and claim contract is present.

- [ ] **Step 3: Finish responsive and accessibility CSS**

Add 1600px, 1280px, 900px, and 560px layout rules; reduced-motion video hiding; focus states; safe-area menu spacing; wrapping for addresses and signatures; fallback styling; and compact-height hero behavior. Keep desktop landing scrollable because it contains the full product story.

- [ ] **Step 4: Update metadata and handoff docs**

Describe the mixed visual direction, the decorative video fallback, and the unchanged live/simulated/onchain boundaries. Do not change milestone completion claims.

- [ ] **Step 5: Run full verification**

Run: `pnpm test && pnpm run typecheck && pnpm run build`

Expected: all non-credentialed tests pass, TypeScript exits 0, and all four routes appear in the successful Next.js build.

- [ ] **Step 6: Perform one visual QA pass**

Inspect `/`, `/app`, `/demo`, and `/docs` at desktop and mobile sizes without screen recording. Confirm video fallback, no white flash, no dead links, no clipped controls, no horizontal overflow, and no false claims.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx README.md docs/demo.md src/demo/public-demo-ui.test.tsx
git commit -m "fix: finish Pactlet responsive frontend refresh"
```
