# pactlet security model

## Security claim

Solana devnet and the x402 SVM scheme prove the signed token transfer. pactlet's hierarchical authorization is enforced by a trusted backend. This prototype is custodial, single-process, and unsuitable for real funds.

## Assets and trust boundaries

- User wallet: remains in the wallet provider and signs authentication/funding only.
- Task signer: disposable devnet secret held only by the backend process.
- API credentials: server-only environment values.
- Wallet authentication: five-minute signed challenges and thirty-minute
  HMAC-authenticated session cookies, bound to the configured application origin.
- Policy state: authoritative SQLite records, not model text or browser state.
- External input: wallet messages, x402 challenges, facilitator/RPC replies, merchant responses, and model outputs are untrusted.

## Threats and controls

### Secret exposure

Agents receive only a purchase tool. Secrets never enter prompts, client bundles, logs, events, error payloads, or git. Production would require remote/hardware-backed signing and a separately designed custody model.

The dashboard receives only boolean provider-readiness flags. `AI_API_KEY`, `TYPESAFE_API_KEY`, RPC credentials, and task signer material remain server-only. Model tracing is disabled so prompts and tool results are not exported through the Agents SDK tracing path.

### Authority widening

Delegation validation enforces a subset service list, no budget above available parent funds, and no expiry after the parent. Canceled/expired authority cannot create reservations.

### SSRF, redirect and merchant substitution

Purchase input uses configured service IDs, not URLs. The HTTP client uses fixed origins, blocks redirects, and matches the x402 resource, network, mint, recipient, amount, and scheme before signing.

### Replay and duplicate payment

A task-scoped purchase key is unique. Legitimate retries return the existing state/result. The SVM facilitator's duplicate-settlement protection complements, but does not replace, the application ledger.

Wallet challenges no longer depend on a process-local nonce map. Their complete
claims are authenticated with a server-only HMAC and expire after five minutes;
wallet ownership is still proven with an Ed25519 signature over the exact message.
Sessions are also signed and expire after thirty minutes, so they remain verifiable
across serverless cold starts. A captured, already-signed challenge can be replayed
within its short validity window to obtain an equivalent session for the same
wallet; HTTPS, strict-SameSite HTTP-only cookies, and the short expiry limit this
prototype risk. Durable one-time challenge consumption remains production backlog.

### Concurrent overspend

Available amount includes settled spend, pending reservations, and active child allocations. Calculation and reservation are one SQLite immediate transaction. A unique request key and transactional write prevent two concurrent requests from both spending the same availability.

### Timeout and ambiguous settlement

A timeout is not a failure. If a transaction may have been broadcast, the reservation remains pending and the signature is reconciled through devnet RPC. pactlet does not resign or retry until the outcome is known. Only a definite pre-broadcast failure releases the reservation.

### Cancellation and expiry

Cancellation and expiry stop new reservations. They cannot reverse a transaction already broadcast. The dashboard states this limitation.

### Challenge or facilitator compromise

Startup checks `/supported` for the exact protocol/network/scheme tuple. Every challenge is matched to local allowlists. Facilitator traffic has bounded timeouts and fail-closed parsing. A successful HTTP response is not accepted as payment without x402 settlement data and chain confirmation.

### Database or process failure

Wallet challenges and sessions now survive process replacement because they are
cryptographically verifiable rather than stored in memory. Task signers and task
account metadata are still process-local, while WAL/transaction semantics protect
only the local ledger. There is no distributed lock, HA, backup, or multi-process
guarantee. Production needs encrypted signer storage, durable shared storage,
reconciliation workers, incident handling, and monitored RPC redundancy.

### Funding attribution limitation

The MVP funding poll requires both a confirmed signature and a task ATA balance at least equal to the allocation, but it does not yet prove that the observed balance increase came from that exact signature. The x402 settlement path records the facilitator settlement signature. Production must inspect the confirmed transaction's token balance changes and bind them to the configured source, destination, mint, and amount.

## Required negative tests

Unauthorized merchant, wrong mint, wrong network, wrong recipient, amount above remaining budget, expired authority, canceled authority, duplicate purchase key, simultaneous overspend, definite failure, and indeterminate settlement must all have explicit tests.
