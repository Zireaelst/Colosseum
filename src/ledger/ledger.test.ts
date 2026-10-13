import { afterEach, describe, expect, test } from "vitest";

import { Ledger } from "./ledger";

const now = Date.UTC(2026, 9, 12, 12, 0, 0);
const openLedgers: Ledger[] = [];

function activeLedger(allocation = 1_000_000n) {
  const ledger = Ledger.memory();
  openLedgers.push(ledger);
  ledger.createTask({
    id: "task-1",
    ownerWallet: "wallet-1",
    allocation,
    expiresAt: now + 60_000,
    mandate: {
      purpose: "Buy the configured paid research brief",
      serviceId: "research-api",
      resourceId: "research-brief",
      maxAmount: allocation,
    },
  });
  ledger.createDelegation({
    id: "research-agent",
    taskId: "task-1",
    parentId: null,
    allocation,
    expiresAt: now + 30_000,
    services: ["research-api"],
    now,
  });
  return ledger;
}

afterEach(() => {
  for (const ledger of openLedgers.splice(0)) {
    ledger.close();
  }
});

describe("Ledger.reservePurchase", () => {
  test("rejects a resource outside the task mandate without reserving budget", () => {
    const ledger = activeLedger();

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-wrong-resource",
        serviceId: "research-api",
        resourceId: "cloud-credit",
        amount: 250_000n,
        now,
      }),
    ).toMatchObject({ ok: false, code: "RESOURCE_NOT_ALLOWED" });
    expect(ledger.availableAmount("research-agent", now)).toBe(1_000_000n);
  });

  test("rejects an amount above the task per-purchase maximum", () => {
    const ledger = activeLedger(2_000_000n);

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-over-cap",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 2_000_001n,
        now,
      }),
    ).toMatchObject({ ok: false, code: "PURCHASE_LIMIT_EXCEEDED" });
    expect(ledger.availableAmount("research-agent", now)).toBe(2_000_000n);
  });

  test("rejects reuse of a purchase reference with changed terms", () => {
    const ledger = activeLedger();
    const first = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });

    const conflict = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 500_000n,
      now: now + 1,
    });

    expect(first.ok).toBe(true);
    expect(conflict).toMatchObject({
      ok: false,
      paymentRequestId: first.paymentRequestId,
      replayed: true,
      code: "IDEMPOTENCY_CONFLICT",
    });
    expect(ledger.taskSnapshot("task-1", now + 1).events[0]).toMatchObject({
      eventType: "payment_rejected",
      paymentRequestId: first.paymentRequestId,
      details: {
        code: "IDEMPOTENCY_CONFLICT",
        purchaseRef: "purchase-1",
      },
    });
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(750_000n);
  });

  test("atomically reserves an allowed purchase and reduces available budget", () => {
    const ledger = activeLedger();

    const result = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      state: "reserved",
      amount: 250_000n,
      availableAfter: 750_000n,
    });
    expect(ledger.availableAmount("research-agent", now)).toBe(750_000n);
  });

  test("replays the original request for the same purchase reference", () => {
    const ledger = activeLedger();
    const first = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });

    const replay = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now: now + 1,
    });

    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({
      ok: true,
      paymentRequestId: first.paymentRequestId,
      replayed: true,
      state: "reserved",
      amount: 250_000n,
      availableAfter: 750_000n,
    });
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(750_000n);
  });

  test("does not let two competing reservations exceed one allocation", async () => {
    const ledger = activeLedger();

    const [first, second] = await Promise.all([
      Promise.resolve().then(() =>
        ledger.reservePurchase({
          delegationId: "research-agent",
          purchaseRef: "purchase-1",
          serviceId: "research-api",
          resourceId: "research-brief",
          amount: 700_000n,
          now,
        }),
      ),
      Promise.resolve().then(() =>
        ledger.reservePurchase({
          delegationId: "research-agent",
          purchaseRef: "purchase-2",
          serviceId: "research-api",
          resourceId: "research-brief",
          amount: 700_000n,
          now,
        }),
      ),
    ]);

    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect([first, second].find((result) => !result.ok)).toMatchObject({
      ok: false,
      code: "BUDGET_EXCEEDED",
      state: "rejected",
    });
    expect(ledger.availableAmount("research-agent", now)).toBe(300_000n);
  });

  test("subtracts active child allocations from the parent's available budget", () => {
    const ledger = activeLedger();
    ledger.createDelegation({
      id: "research-child",
      taskId: "task-1",
      parentId: "research-agent",
      allocation: 400_000n,
      expiresAt: now + 10_000,
      services: ["research-api"],
      now,
    });

    expect(ledger.availableAmount("research-agent", now)).toBe(600_000n);
    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-1",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 700_000n,
        now,
      }),
    ).toMatchObject({ ok: false, code: "BUDGET_EXCEEDED" });
    expect(ledger.availableAmount("research-agent", now + 10_000)).toBe(
      1_000_000n,
    );
  });

  test("rejects an unauthorized service without reserving budget", () => {
    const ledger = activeLedger();

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-1",
        serviceId: "analysis-api",
        resourceId: "research-brief",
        amount: 250_000n,
        now,
      }),
    ).toMatchObject({ ok: false, code: "SERVICE_NOT_ALLOWED" });
    expect(ledger.availableAmount("research-agent", now)).toBe(1_000_000n);
  });

  test("blocks new reservations after delegation cancellation", () => {
    const ledger = activeLedger();
    ledger.cancelDelegation("research-agent", now);

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-after-cancel",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 250_000n,
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, code: "AUTHORITY_CANCELLED" });
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(1_000_000n);
  });

  test("blocks a reservation at or after delegation expiry", () => {
    const ledger = activeLedger();

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-after-expiry",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 250_000n,
        now: now + 30_000,
      }),
    ).toMatchObject({ ok: false, code: "AUTHORITY_EXPIRED" });
    expect(ledger.availableAmount("research-agent", now + 30_000)).toBe(
      1_000_000n,
    );
  });

  test("rejects a non-positive amount before creating a reservation", () => {
    const ledger = activeLedger();

    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-zero",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 0n,
        now,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_AMOUNT" });
    expect(ledger.availableAmount("research-agent", now)).toBe(1_000_000n);
  });

  test("does not persist a child delegation above parent availability", () => {
    const ledger = activeLedger();

    expect(() =>
      ledger.createDelegation({
        id: "oversized-child",
        taskId: "task-1",
        parentId: "research-agent",
        allocation: 1_000_001n,
        expiresAt: now + 10_000,
        services: ["research-api"],
        now,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "BUDGET_EXCEEDED",
      }),
    );
    expect(ledger.availableAmount("research-agent", now)).toBe(1_000_000n);
  });
});

describe("Ledger settlement lifecycle", () => {
  test("keeps an uncertain settlement reserved and blocks a duplicate transfer", () => {
    const ledger = activeLedger();
    const reserved = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });
    if (!reserved.ok) {
      throw new Error("expected reservation to succeed");
    }

    ledger.markSettlementPending(reserved.paymentRequestId, now + 1);

    expect(ledger.availableAmount("research-agent", now + 1)).toBe(750_000n);
    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-1",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 250_000n,
        now: now + 2,
      }),
    ).toMatchObject({
      ok: true,
      paymentRequestId: reserved.paymentRequestId,
      replayed: true,
      state: "settlement_pending",
      availableAfter: 750_000n,
    });
  });

  test("releases a reservation only after a definite settlement failure", () => {
    const ledger = activeLedger();
    const reserved = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 900_000n,
      now,
    });
    if (!reserved.ok) {
      throw new Error("expected reservation to succeed");
    }

    ledger.failPayment(
      reserved.paymentRequestId,
      "FACILITATOR_REJECTED",
      now + 1,
    );

    expect(ledger.availableAmount("research-agent", now + 1)).toBe(1_000_000n);
    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-1",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 900_000n,
        now: now + 2,
      }),
    ).toMatchObject({
      ok: false,
      paymentRequestId: reserved.paymentRequestId,
      replayed: true,
      state: "failed",
      code: "SETTLEMENT_FAILED",
      availableAfter: 1_000_000n,
    });
    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-2",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 900_000n,
        now: now + 2,
      }),
    ).toMatchObject({ ok: true, replayed: false, state: "reserved" });
  });

  test("persists a confirmed signature while retaining the spent amount", () => {
    const ledger = activeLedger();
    const reserved = ledger.reservePurchase({
      delegationId: "research-agent",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });
    if (!reserved.ok) {
      throw new Error("expected reservation to succeed");
    }

    ledger.markSettlementPending(reserved.paymentRequestId, now + 1);
    ledger.confirmSettlement(
      reserved.paymentRequestId,
      "devnet-signature-1",
      now + 2,
    );

    expect(ledger.paymentRequest(reserved.paymentRequestId)).toMatchObject({
      id: reserved.paymentRequestId,
      state: "settled",
      reservationState: "settled",
      transactionSignature: "devnet-signature-1",
    });
    expect(ledger.availableAmount("research-agent", now + 2)).toBe(750_000n);
    expect(
      ledger.reservePurchase({
        delegationId: "research-agent",
        purchaseRef: "purchase-1",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 250_000n,
        now: now + 3,
      }),
    ).toMatchObject({ ok: true, replayed: true, state: "settled" });
  });

  test("returns only an expired child's unspent allocation to its parent", () => {
    const ledger = activeLedger();
    ledger.createDelegation({
      id: "research-child",
      taskId: "task-1",
      parentId: "research-agent",
      allocation: 400_000n,
      expiresAt: now + 10_000,
      services: ["research-api"],
      now,
    });
    const reserved = ledger.reservePurchase({
      delegationId: "research-child",
      purchaseRef: "child-purchase",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250_000n,
      now,
    });
    if (!reserved.ok) {
      throw new Error("expected child reservation to succeed");
    }
    ledger.markSettlementPending(reserved.paymentRequestId, now + 1);
    ledger.confirmSettlement(
      reserved.paymentRequestId,
      "devnet-child-signature",
      now + 2,
    );

    expect(ledger.availableAmount("research-agent", now + 2)).toBe(600_000n);
    expect(ledger.availableAmount("research-agent", now + 10_000)).toBe(
      750_000n,
    );
  });
});
