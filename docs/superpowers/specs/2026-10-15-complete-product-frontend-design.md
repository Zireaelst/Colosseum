# Pactlet Complete Product Frontend Design

## Goal

Turn the current cinematic hero into a complete, coherent public product experience that explains Pactlet, onboards a first-time user, and clearly separates the live devnet app from the simulated demo.

## Chosen direction

Use the existing Pactlet brand system rather than copying either supplied reference. The landing page keeps the premium dark, full-bleed first viewport, then becomes a focused product narrative. Existing Pactlet SVG assets provide the visual language; small motion and glow effects are implemented locally in React and CSS instead of adding a large UI dependency.

The supplied landing prompts are visual references only. Their names, copy, external video, fonts, metrics, and brand claims are not carried into Pactlet.

## Information architecture

### `/` — product landing

1. Sticky responsive navigation with working links to Product, How it works, Security, Docs, Demo, and App.
2. Cinematic hero with the core promise: “Let agents pay. You set the limits.”
3. Problem section explaining why a wallet cap alone does not express task intent.
4. Product section showing budgets, hierarchical delegation, and checks before payment.
5. How-it-works sequence: connect, define authority, delegate, pay, verify.
6. Payment-boundary section showing the backend enforcement pipeline and Solana signature boundary.
7. Honest security section distinguishing backend-enforced policy from the devnet transaction proof.
8. Final CTA and compact footer linking every public route.

The landing page must scroll normally on desktop and mobile. No navigation item may point to a missing anchor.

### `/app` — live devnet product

Keep the existing wallet and task functionality. Present it as a guided three-stage flow:

1. Connect and prove wallet ownership.
2. Create and fund a disposable task account.
3. Run the bounded agent and inspect policy/payment results.

The interface must keep all current safety copy, show the devnet-only status, and avoid implying that backend rules are onchain. Empty, loading, connected, funding, pending, confirmed, rejected, and cancelled states remain readable on mobile.

### `/demo` — simulated walkthrough

Keep the deterministic four-step walkthrough and label it as simulated above the fold. Improve hierarchy and navigation, but never display a fake Explorer signature or imply that a transaction was broadcast.

### `/docs` — public quick start

Create a concise documentation page with:

- Product model and trust boundary.
- Five-step demo flow.
- Environment/readiness overview using variable names only.
- API surface overview without secrets or private implementation details.
- Limitations and production backlog.
- Links to the app, simulated demo, architecture document on GitHub, and Solana devnet Explorer.

The docs page is an onboarding aid, not a generated API reference.

## Visual system

- Palette: midnight `#0B1016`, lime `#CBFF69`, violet `#8970FF`, off-white `#F7F8FA`, muted `#9DA8B2`.
- Typography: local/system sans for interface and headings; mono only for addresses, signatures, IDs, and technical labels.
- Surfaces: restrained translucent cards, thin borders, soft lime/violet ambient gradients, no excessive glassmorphism.
- Motion: entrance and hover transitions only; all motion disabled under `prefers-reduced-motion`.
- Assets: use files already copied to `public/brand`. The hero background, delegation illustration, budget/policy graphics, and section divider are preferred. Do not rely on third-party video availability.
- Claims: use implemented facts only. Avoid customer counts, traction numbers, uptime, production-security claims, and real-payment claims until evidence exists.

## Component boundaries

- `app/components/site-header.tsx`: shared responsive public navigation.
- `app/components/site-footer.tsx`: shared public footer and route links.
- `app/components/brand-mark.tsx`: accessible Pactlet mark shared by public pages.
- `app/components/landing/*`: landing-only product story sections.
- `app/components/app-progress.tsx`: presentational live-app onboarding state.
- `app/docs/page.tsx`: server-rendered documentation page.
- `app/page.tsx`: composes landing sections; contains no page-sized inline stylesheet.
- `app/globals.css`: shared tokens and component styles, grouped by public site, app, demo, and responsive rules.

Existing wallet, policy, persistence, agent, and payment modules are not redesigned by this frontend work.

## Interaction and error behavior

- Mobile navigation supports button semantics, `aria-expanded`, Escape, link-close, and viewport-resize close.
- Anchor navigation accounts for the sticky header.
- CTAs use real routes: primary to `/app`, secondary to `/demo`, documentation to `/docs`.
- Wallet errors remain adjacent to the action that caused them.
- Funding that may have been broadcast remains “confirming”; the UI must not label it failed or re-enable a duplicate payment path.
- Long wallet addresses, mints, recipients, and signatures wrap without breaking layout.

## Performance and accessibility

- Prefer optimized static SVG assets over autoplay video.
- Avoid new runtime UI dependencies unless a required interaction cannot be built safely with existing React/CSS.
- Preserve semantic landmarks, keyboard access, visible focus states, sufficient contrast, and reduced-motion behavior.
- Keep mobile usable at 320px and desktop layouts bounded at a readable maximum width.

## Tests and verification

Behavior changes follow TDD. Add focused render tests for:

- Landing navigation targets all existing sections/routes and contains no dead anchor.
- Public claims and trust-boundary copy remain honest.
- Docs exposes the quick-start, devnet-only, backend-enforced, and simulated/live distinctions.
- App progress derives the correct step from wallet, task, and funding state.
- Demo remains explicitly simulated.

Run focused Vitest tests, the complete test suite, TypeScript typecheck, and the production build. Perform one final responsive visual inspection without screen recording. Deployment and pushing remain separate decisions.

## Out of scope

- Mainnet, real funds, production custody, KMS migration, or smart-account policy enforcement.
- New payment protocols, marketplace features, pricing, accounts, or billing.
- Claims based on unverified devnet settlement evidence.
- Replacing working wallet/payment behavior solely for visual reasons.
