import { describe, expect, it } from "vitest";
import { hasUnresolvedPurchase, taskBudgetSummary } from "./task-summary";

describe("task budget summary", () => {
  it("blocks a new purchase while allowing the same unresolved reference to be retried", () => {
    const payments = [{ state: "settlement_pending", purchaseRef: "original" }];
    expect(hasUnresolvedPurchase(payments)).toBe(true);
    expect(hasUnresolvedPurchase(payments, "new-reference")).toBe(true);
    expect(hasUnresolvedPurchase(payments, "original")).toBe(false);
    expect(hasUnresolvedPurchase([{ state: "settled", purchaseRef: "original" }])).toBe(false);
  });
  it("counts settled and pending amounts once and excludes rejected and failed attempts", () => {
    expect(taskBudgetSummary("10000000", [
      { state: "settled", amount: "1000" },
      { state: "reserved", amount: "2000" },
      { state: "settlement_pending", amount: "3000" },
      { state: "rejected", amount: "9999999" },
      { state: "failed", amount: "9999999" },
    ])).toEqual({ spent: "0.001", reserved: "0.005", remaining: "9.994" });
  });
  it("keeps integer precision for large base-unit amounts", () => {
    expect(taskBudgetSummary("9007199254740993000000", [{ state: "settled", amount: "1" }]).remaining).toBe("9007199254740992.999999");
  });
});
