import { describe, expect, it } from "vitest";

import { toTaskViewModel, unitsToToken } from "./task-view-model";

describe("task dashboard view model", () => {
  it("formats token base units without losing integer precision", () => {
    expect(unitsToToken("10000000")).toBe("10");
    expect(unitsToToken("1250")).toBe("0.00125");
  });

  it("builds the 10/4/3 delegation tree and payment explorer links", () => {
    const view = toTaskViewModel({
      task: {
        mandate: {
          purpose: "Compare a paid research source",
          serviceId: "research-api",
          resourceId: "research-brief",
          maxAmount: "1000",
        },
      },
      delegations: [
        { id: "task:manager", parentId: null, allocation: "10000000", available: "3000000", status: "active", services: ["research-api", "analysis-api"] },
        { id: "task:research", parentId: "task:manager", allocation: "4000000", available: "3999000", status: "active", services: ["research-api"] },
        { id: "task:analysis", parentId: "task:manager", allocation: "3000000", available: "3000000", status: "cancelled", services: ["analysis-api"] },
      ],
      payments: [
        { id: "paid", purchaseRef: "order-1", serviceId: "research-api", resourceId: "research-brief", amount: "1000", state: "settled", rejectionCode: null, transactionSignature: "abc" },
        { id: "blocked", purchaseRef: "order-2", serviceId: "unknown", resourceId: "research-brief", amount: "1000", state: "rejected", rejectionCode: "SERVICE_NOT_ALLOWED", transactionSignature: null },
      ],
      events: [{ id: 1, eventType: "payment.rejected", details: {} }],
    });

    expect(view.delegations.map((item) => [item.name, item.depth, item.allocation])).toEqual([
      ["manager", 0, "10"],
      ["research", 1, "4"],
      ["analysis", 1, "3"],
    ]);
    expect(view.payments[0]?.explorerUrl).toBe("https://explorer.solana.com/tx/abc?cluster=devnet");
    expect(view.mandate).toEqual({
      purpose: "Compare a paid research source",
      serviceId: "research-api",
      resourceId: "research-brief",
      maxAmount: "0.001",
    });
    expect(view.payments[0]).toMatchObject({
      purchaseRef: "order-1",
      resourceId: "research-brief",
    });
    expect(view.payments[1]).toMatchObject({ label: "REJECTED · SERVICE_NOT_ALLOWED", tone: "danger", explorerUrl: null });
  });
});
