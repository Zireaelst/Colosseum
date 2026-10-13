import { describe, expect, it } from "vitest";

import { SupabaseLedgerStore, StorageUnavailableError } from "./ledger-store";

describe("SupabaseLedgerStore", () => {
  it("maps decimal-string reservation values to bigint", async () => {
    const client = {
      rpc: async () => ({
        data: {
          ok: true,
          paymentRequestId: "payment-1",
          replayed: true,
          state: "settlement_pending",
          amount: "1000",
          availableAfter: "3999000",
        },
        error: null,
      }),
    };
    const store = new SupabaseLedgerStore(client as never);

    await expect(
      store.reservePurchase({
        delegationId: "research",
        purchaseRef: "purchase-1",
        serviceId: "research-api",
        resourceId: "research-brief",
        amount: 1_000n,
        now: 1_800_000_000_000,
      }),
    ).resolves.toEqual({
      ok: true,
      paymentRequestId: "payment-1",
      replayed: true,
      state: "settlement_pending",
      amount: 1_000n,
      availableAfter: 3_999_000n,
    });
  });

  it("hides raw database errors behind a typed storage failure", async () => {
    const client = {
      rpc: async () => ({
        data: null,
        error: { message: "postgres password and internal table details" },
      }),
    };
    const store = new SupabaseLedgerStore(client as never);

    await expect(
      store.availableAmount("research", Date.now()),
    ).rejects.toEqual(expect.any(StorageUnavailableError));
    await expect(
      store.availableAmount("research", Date.now()),
    ).rejects.not.toThrow(/password|table details/);
  });
});
