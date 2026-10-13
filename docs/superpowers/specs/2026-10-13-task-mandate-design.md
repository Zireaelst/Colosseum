# Pactlet Task Mandate Design

**Date:** 2026-10-13
**Status:** Approved

## Goal

Bind every agent purchase to a structured, user-created task mandate so an
allowlisted merchant cannot charge Pactlet for the wrong resource or more than
the user allowed per purchase.

## MVP contract

A task mandate contains:

- a human-readable purpose;
- one configured service ID (`research-api`);
- one configured resource ID (`research-brief`);
- a positive integer maximum amount per purchase in token base units;
- the existing 10 test-USDC total allocation and task expiry.

The one-service/one-resource shape is intentional for the public MVP. It keeps
the payment surface deny-by-default while leaving the persistence model ready
for additional configured products later.

## Enforcement

The mandate is stored in SQLite with the task. The purchase service receives a
server-bound service and resource; neither the model nor an arbitrary URL can
override them. Before signing, the ledger atomically verifies the task,
delegation, service, resource, per-purchase maximum, total available budget,
expiry, and cancellation status.

Every deliberate purchase has an explicit `purchaseRef`. Reusing the same
reference with identical terms returns the original outcome and cannot create a
second transfer. Reusing it with different service, resource, or amount returns
`IDEMPOTENCY_CONFLICT` before signing.

Jev remains a routing classifier only. It does not approve resources, calculate
limits, compare time, or sign a payment.

## API and UI

The authenticated task-creation route accepts purpose, fixed service/resource,
maximum base-unit amount, and duration. The dashboard shows the stored mandate,
and each payment row shows its resource and purchase reference. The initial UI
uses safe defaults and a small task-purpose input; broader product selection is
deferred until multiple real merchants exist.

## Tests

Focused tests must prove:

- a matching resource below the per-purchase maximum reserves normally;
- a wrong resource and excessive per-purchase amount are rejected without a
  reservation;
- the same purchase reference replays one result;
- the same reference with changed terms is rejected as a conflict;
- snapshots return the mandate, resource, and purchase reference;
- the purchase transport is not called after a mandate rejection.

## Trust boundary

This mandate is enforced by Pactlet's trusted backend, not by a Solana program.
Solana proves only a resulting devnet token transfer and signature. A later
wallet-signed mandate or step-up approval can strengthen user consent, but is
not required for this pass.
