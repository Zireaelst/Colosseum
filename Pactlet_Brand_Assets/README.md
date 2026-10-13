# Pactlet — Brand Asset Kit

Minimal brand direction for the selected **Monogram P** identity. Editable SVG source + same-size PNG exports are included for every graphic. This pack focuses on **non-logo brand assets** and is intended for a Colosseum Crypto World's Fair **devnet-only MVP**.

## Directory / recommended use

| Asset | Dimensions | Use |
|---|---:|---|
| `social/x-header` | 1500×500 | X/Twitter profile header |
| `social/linkedin-banner` | 1584×396 | LinkedIn banner |
| `social/open-graph` | 1200×630 | Link previews / OG image |
| `social/launch-square` | 1080×1080 | Square launch post |
| `social/launch-story` | 1080×1920 | Story vertical post |
| `web/hero-background` | 1600×950 | Abstract text-free landing background |
| `web/delegation-illustration` | 1400×900 | Hierarchical delegation hero image |
| `web/feature-budgets` | 800×600 | Feature graphic: budgets |
| `web/feature-delegation` | 800×600 | Feature graphic: delegation |
| `web/feature-policy` | 800×600 | Feature graphic: pre-payment check |
| `web/developer-visual` | 1100×680 | Developer section visual, concept only |
| `web/section-divider` | 1600×340 | Decorative section separator |
| `patterns/pattern-dark` | 800×800 | Seamless-ish pattern tile, dark |
| `patterns/pattern-light` | 800×800 | Light pattern tile |
| `extras/sticker` | 900×900 | Sticker graphic |
| `extras/pitch-cover` | 1920×1080 | Pitch presentation cover |

## Brand fundamentals

- Midnight `#0B1016` / lime `#CBFF69` / violet accent `#8970FF` / off-white `#F7F8FA`.
- Typography: **Inter** for UI and headings. A mono family for technical details.
- Main message: **Let agents pay. You set the limits.**
- Alternate: **Delegate tasks. Define the limits.**
- Preferred mark: minimal, rounded geometric P; no robot mascot and no generic lock-only identity.

## Use in Figma, Canva, and the web

- Import SVG for editable scalable vectors (SVG text remains text where the destination supports it); upload PNG for ready-to-post graphics.
- X/LinkedIn banner safe areas vary by platform and device; check crops before publishing.
- Place `social/open-graph.png` at `/public/og.png` and configure OG metadata.
- Use `brand-tokens.css` and `brand-tokens.json` as starting values.

## Accuracy and scope

These graphics are **brand concepts**, not screenshots from the implemented app. Any UI budgets are examples. The sample SDK code is **illustrative, not a real implemented interface**. Pactlet's current MVP scope is **custodial and backend-enforced on Solana devnet**, not an onchain trustless authorization program or a production payments system.
