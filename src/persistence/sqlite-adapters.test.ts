import { afterEach, describe, expect, it } from "vitest";

import type { LedgerStore } from "./ports";
import { SqliteLedgerStore } from "./sqlite-ledger-store";

const openStores: SqliteLedgerStore[] = [];

afterEach(() => {
  for (const store of openStores.splice(0)) store.close();
});

describe("SqliteLedgerStore", () => {
  it("implements the asynchronous ledger contract without weakening idempotency", async () => {
    const store: LedgerStore = new SqliteLedgerStore(":memory:");
    openStores.push(store as SqliteLedgerStore);
    const now = 1_800_000_000_000;

    await store.createTask({
      id: "task-1",
      ownerWallet: "owner",
      allocation: 1_000n,
      expiresAt: now + 60_000,
      mandate: {
        purpose: "Buy one research brief",
        serviceId: "research-api",
        resourceId: "research-brief",
        maxAmount: 250n,
      },
    });
    await store.createDelegation({
      id: "research",
      taskId: "task-1",
      parentId: null,
      allocation: 1_000n,
      expiresAt: now + 60_000,
      services: ["research-api"],
      now,
    });

    const first = await store.reservePurchase({
      delegationId: "research",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250n,
      now,
    });
    const replay = await store.reservePurchase({
      delegationId: "research",
      purchaseRef: "purchase-1",
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 250n,
      now: now + 1,
    });

    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({
      ok: true,
      replayed: true,
      paymentRequestId: first.paymentRequestId,
    });
    expect(await store.availableAmount("research", now + 1)).toBe(750n);
  });
});
