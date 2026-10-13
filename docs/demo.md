# pactlet three-minute demo

## Public submission walkthrough

The deployed `/app` defaults to a browser-only walkthrough so judges can inspect the product without a wallet or persistent server session. Run the allowed purchase, over-budget rejection, cancellation, and retry in order. Every generated payment/event is labeled **SIMULATED**, no Explorer link is fabricated, and no transaction is signed or broadcast.

Switch to **Live Devnet** only for the local single-process flow described below. The hosted-live requirements are tracked in the [public demo design and backlog](superpowers/specs/2026-10-13-public-demo-design.md#backlog-for-a-fully-working-hosted-mvp).

## Script

- **0:00:** Connect a Solana wallet, sign the nonce, preview funding terms, and create a task with 10 test USDC.
- **0:30:** Manager delegates 4 USDC to research and 3 USDC to analysis. Jev classifies the sample subtask and the dashboard shows both narrower authorities. The runtime chips show whether AI, Jev, merchant, and RPC configuration are live.
- **1:00:** Research calls the one allowlisted paid endpoint. Show its V2 `exact` challenge, reserved amount, confirmed devnet payment, and Solana Explorer signature.
- **1:45:** Attempt an unknown service or over-budget amount. Show a backend rejection and demonstrate that no transaction signature was created.
- **2:15:** Cancel research authority and retry. Show the cancellation rejection, unchanged available budget, and chronological events.
- **2:45:** State the trust boundary: Solana proves the transfer; pactlet's trusted backend enforces delegation, limits, expiry, and cancellation.

## Evidence labels

The final demo must label each item as one of:

- **Real devnet:** confirmed Solana transaction and Explorer signature.
- **Real x402:** V2 `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, facilitator settlement, and confirmed devnet signature belong to the same request.
- **Backend enforced:** policy/ledger decision without an onchain policy program.
- **Deterministic fallback:** local routing used only when Jev is unavailable; never called a Jev result.
- **AI fallback:** if `AI_API_KEY` is absent, the manager result is `demo-fallback`, no model request runs, and no purchase is attempted.
- **Simulated:** any fixture or UI-only event with no live backend/chain evidence.

Current implementation has not yet made a real transfer. It has verified facilitator capability, the devnet mint/ATA path, funding transaction construction, and a live local merchant V2 challenge. Do not present these as a completed x402 payment. The demo becomes “Real x402” only after the funding and paid-request signatures are confirmed and linked in Explorer.
