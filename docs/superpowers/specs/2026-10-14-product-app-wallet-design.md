# Pactlet product app and wallet design

## Goal

Turn the hosted Pactlet experience into a user-facing devnet application while
keeping the deterministic judge walkthrough available as a clearly separate
simulation.

## Routes

- `/` remains the public landing page and links separately to the product and
  guided demo.
- `/app` is the real devnet product flow only: connect wallet, prove ownership,
  define a task, preview funding, approve a devnet transaction, and manage the
  resulting delegation dashboard.
- `/demo` contains the browser-only deterministic walkthrough. Every decision
  remains labeled simulated and it never signs or broadcasts a transaction.

## Wallet integration

Use Solana's current Kit wallet plugin and React bindings with Wallet Standard
discovery. The client is permanently bound to `solana:devnet`; there is no
network selector. The connection UI supports connect, reconnect, disconnect,
and clear empty/error states. If the current browser cannot expose a wallet,
show links to open/install a compatible wallet and a route to `/demo` instead
of presenting the state as an application failure.

The wallet signs an origin-bound authentication challenge before server APIs
accept task mutations. Funding remains a second explicit user approval. Before
that approval, the UI shows payer, mint, amount in base units, and recipient.
Agents never receive the wallet, signer, or raw credentials.

## Compatibility gate

The repository currently pins Solana Kit 5.5.1 because it was proven with the
x402 2.28.0 SVM integration. The current wallet plugin documentation targets
Kit 7+. Upgrade the complete Solana package family only if a small compile and
runtime spike proves the existing x402 challenge, signer construction, funding
transaction, and tests remain compatible. If it fails, retain the tested Kit
family and improve the direct Wallet Standard UI without claiming the new
plugin is integrated.

## User flow and failures

1. The app shows devnet-only and custodial-prototype disclosures.
2. The user connects a Wallet Standard wallet and signs the login challenge.
3. The user enters a short task purpose and creates a disposable task account.
4. The funding card displays all transfer terms before requesting a signature.
5. Confirmed funding unlocks the agent action and live dashboard.
6. Expected wallet rejection, unsupported signing, API failure, and pending
   confirmation are rendered inline with a retry path; unexpected route errors
   use a local Next.js error boundary.

## Acceptance

- `/app` contains no simulated mode or simulated payment claims.
- `/demo` works without a wallet and cannot call live task/payment APIs.
- A supported browser wallet can connect, disconnect, and authenticate.
- A browser without a wallet receives useful recovery actions.
- Mainnet identifiers remain rejected.
- Existing policy, persistence, x402, typecheck, test, and production build
  gates remain green.
