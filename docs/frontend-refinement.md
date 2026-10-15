# Product interface refinement

The supplied rules are preserved in [ui-guidelines.md](ui-guidelines.md) and linked from AGENTS.md.

## Direction

Keep Pactlet's lime/violet identity and cinematic landing hero. Use quiet navigation and restrained controls throughout. The application has a compact sidebar, task header, setup panel, and a clear primary action. The landing includes an illustrative authority overview rather than fabricated receipts or activity.

Primary references inspected on 15 October 2026:

- [Linear](https://linear.app/): product-led storytelling and contextual interface examples.
- [Vercel](https://vercel.com/): concise entry points and developer-oriented information structure.
- [Ramp](https://ramp.com/): a concrete spend-control story and clear calls to action.

These are composition references; Pactlet retains its own copy, assets, behavior, and product boundaries.

## Changes

- Dedicated app workspace replaces the oversized marketing hero and footer on `/app`.
- Task defaults are visible before connection: 10 test USDC, two specialists, 45 minutes.
- Landing authority preview is explicitly illustrative and contains no settled-payment claims.
- Decorative video has a pause/play control and responds to reduced-motion preference.
- Mobile navigation traps focus, closes with Escape, and restores focus to the toggle.
- Task creation trims input, shows inline validation, supports Ctrl/Command+Enter, prevents resubmission while pending, and recovers from network errors.
- Cancelling research authority asks for confirmation and reports network failure.
- Controls use more restrained typography, mobile text inputs use 16px, and numeric comparisons use tabular figures.

## Verification boundaries

Local browser QA passed for `/`, `/app`, `/demo`, and `/docs` at 390px, 1440px, and 2560px with no horizontal overflow or page JavaScript errors. The mobile menu passed focus wrapping and Escape focus restoration. The four-step simulated demo completed on mobile and kept its no-broadcast labels.

Automated test/build results and responsive browser inspection are reported in the handoff. This change does not establish an onchain payment result. A complete performance audit, Safari/iOS Low Power testing, authenticated wallet funding, and confirmed x402 settlement remain separate verification tasks.
