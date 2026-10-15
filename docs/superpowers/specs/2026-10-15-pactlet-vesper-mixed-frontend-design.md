# Pactlet Vesper-Mixed Frontend Design

## Goal

Rework every public Pactlet surface into one coherent product experience that combines the supplied Vesper composition with Pactlet's lime-and-violet identity. Preserve all working wallet, task, policy, persistence, and payment behavior.

## Chosen direction

Use the Vesper reference for composition and motion, not for identity or product claims. The landing hero uses the supplied background video, a black full-bleed first viewport, bottom-centered copy, metallic pill navigation, restrained entrance motion, and compact proof labels. Pactlet's existing mark, lime primary accent, violet ambient light, copy, and SVG diagrams remain the brand language.

The landing continues below the hero. `/app`, `/demo`, and `/docs` share the same header, typography, controls, colors, and surface treatment, while prioritizing clarity over cinematic effects.

## Experience architecture

### Shared shell

- Black base with lime and violet ambient highlights.
- Inter-style sans typography with a restrained italic serif accent in major marketing headings.
- Metallic dark navigation pills, lime primary actions, translucent secondary actions, thin borders, and visible keyboard focus.
- Responsive full-screen mobile menu with Escape, link-close, resize-close, and body-scroll restoration.
- Reduced-motion behavior and a no-animation fallback.

### Landing `/`

1. Full-viewport cinematic hero using the supplied remote video URL as a decorative muted autoplay background.
2. Pactlet headline, honest devnet status, and working links to the live app and simulated demo.
3. Three factual proof labels: scoped authority, pre-signature checks, and Solana devnet receipts. No fabricated traction metrics.
4. Problem section explaining why a wallet cap alone cannot express task intent.
5. Product section covering budgets, service allowlists, expiries, cancellations, and hierarchical narrowing.
6. Payment-boundary sequence showing backend policy enforcement before signing and Solana proof after broadcast.
7. Honest security section distinguishing the custodial backend prototype from onchain enforcement.
8. Final CTA and footer.

The remote video is progressive enhancement. A Pactlet SVG and black/lime/violet gradient provide a complete fallback if it cannot load.

### Live app `/app`

- Keep the existing three-stage wallet, task funding, and agent-run flow.
- Restyle it as a focused operator console with the same Pactlet-Vesper shell.
- Make the active step, devnet-only boundary, payer, mint, amount, recipient, pending state, rejection, and Explorer receipt easy to scan.
- Preserve all existing runtime contracts and error behavior.

### Demo `/demo`

- Keep the deterministic walkthrough clearly labelled `Simulated`.
- Present delegation, allowed purchase, rejected purchase, cancellation, and remaining budget as a guided timeline.
- Never display a fake signature or imply a transaction was broadcast.

### Docs `/docs`

- Use the same branded shell with a readable documentation layout.
- Keep quick start, trust boundary, environment variable names, live-versus-simulated distinction, API overview, limitations, and production backlog.
- Avoid exposing secrets or turning setup notes into marketing claims.

## Components and data boundaries

- `SiteHeader`, `SiteFooter`, and `BrandMark` own the shared shell.
- Landing components remain server-renderable; a small client component owns video readiness and entrance/menu fallbacks only when necessary.
- Wallet and dashboard components retain their state and API calls; styling and semantic grouping may change, business logic may not.
- Shared visual tokens and responsive rules live in `app/globals.css`.
- The video URL is centralized in a landing component rather than repeated in CSS or unrelated pages.

## Truth and safety boundaries

- Product name is Pactlet; do not introduce Vesper, beeple, or AgentPass in user-facing output.
- Solana devnet only.
- Policy is enforced by the trusted backend; Solana proves the submitted token transfer and signature.
- The task payment account is a custodial prototype and agents never receive keys.
- Do not claim a real x402 settlement without verified onchain evidence.
- Do not invent customer counts, revenue, uptime, savings, or production-security claims.

## Accessibility and performance

- Semantic landmarks, one primary heading per page, keyboard-operable navigation, visible focus, sufficient contrast, and 320px support.
- Decorative video is muted, looped, non-interactive, and hidden from assistive technology.
- Use `poster`/CSS fallback behavior, `preload="metadata"`, and no video dependency on app, demo, or docs.
- Respect `prefers-reduced-motion`; disable nonessential motion and show final states immediately.
- Long addresses, signatures, and IDs wrap safely.

## Test and release gates

1. Add focused failing render/contract tests before each behavior change.
2. Verify navigation targets, Pactlet-only branding, honest claims, video fallback markup, route labels, and retained app/demo semantics.
3. Run focused tests, full Vitest, TypeScript typecheck, and Next.js production build.
4. Perform one desktop and mobile visual QA pass without screen recording.
5. Update docs to describe the visual refresh without changing milestone or onchain-evidence claims.

Deployment and pushing are separate from implementation unless the user explicitly requests them again.
