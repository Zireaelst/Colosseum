import { describe, expect, it } from "vitest";
import { filterTaskHistory, paymentHistoryPage, replaceFilterQuery, explainPaymentDecision } from "./history-filters";

describe("history filters", () => {
  it("searches the loaded task page without changing its entries", () => {
    const tasks = [{ id: "task-alpha", paymentAddress: "PayerOne", fundingSignature: "sig-one" }, { id: "task-beta", paymentAddress: "PayerTwo" }];
    expect(filterTaskHistory(tasks, " payerone ", "all")).toEqual([tasks[0]]);
    expect(filterTaskHistory(tasks, "task", "unfunded")).toEqual([tasks[1]]);
    expect(filterTaskHistory(tasks, "", "funded")).toEqual([tasks[0]]);
    expect(tasks).toHaveLength(2);
  });

  it("pages every matching payment instead of hiding attempts older than the latest 20", () => {
    const payments = Array.from({ length: 47 }, (_, index) => ({ id: `p-${index}`, state: "settled", serviceId: "research-api", resourceId: "brief", purchaseRef: `ref-${index}`, rejectionCode: null, transactionSignature: null }));
    const page = paymentHistoryPage(payments, "all", "", 2);
    expect(page.total).toBe(47);
    expect(page.items).toHaveLength(20);
    expect(page.items[0].id).toBe("p-26");
    expect(paymentHistoryPage(payments, "all", "ref-0", 9)).toMatchObject({ page: 1, total: 1 });
    expect(paymentHistoryPage(payments, "rejected", "", 1).items).toEqual([]);
  });

  it("keeps reserved and settlement-pending payments in the pending filter", () => {
    const payments = ["reserved", "settlement_pending", "settled", "rejected", "failed"].map(state => ({ id: state, state, purchaseRef: state, serviceId: "research", resourceId: "brief", rejectionCode: null, transactionSignature: null }));
    expect(paymentHistoryPage(payments, "pending", "", 1).items.map(item => item.state)).toEqual(["settlement_pending", "reserved"]);
    expect(paymentHistoryPage(payments, "failed", "", 1).items.map(item => item.state)).toEqual(["failed"]);
  });

  it("preserves the selected task and unrelated filters in shareable URLs", () => {
    const url = replaceFilterQuery("https://pactlet.example/app?task=a&paymentStatus=all&taskSearch=abc", { paymentStatus: "pending", paymentPage: "1" }, { paymentStatus: "all", paymentPage: "1" });
    expect(url.searchParams.get("task")).toBe("a");
    expect(url.searchParams.get("taskSearch")).toBe("abc");
    expect(url.searchParams.get("paymentStatus")).toBe("pending");
    expect(url.searchParams.has("paymentPage")).toBe(false);
  });

  it("explains rejections and preserves uncertainty for unsettled transfers", () => {
    expect(explainPaymentDecision("rejected", "BUDGET_EXCEEDED")).toContain("available budget");
    expect(explainPaymentDecision("settlement_pending", null)).toContain("reserved");
    expect(explainPaymentDecision("settlement_pending", null)).not.toContain("failed");
    expect(explainPaymentDecision("rejected", "UNKNOWN_CODE")).toContain("Review");
    expect(explainPaymentDecision("rejected", "__proto__")).toContain("Review");
  });
});
