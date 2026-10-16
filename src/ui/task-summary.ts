import { unitsToToken } from "./task-view-model";

export function hasUnresolvedPurchase(payments: Array<{ state: string; purchaseRef: string }>, retryPurchaseRef?: string): boolean {
  return payments.some(payment => (payment.state === "reserved" || payment.state === "settlement_pending") && payment.purchaseRef !== retryPurchaseRef);
}

export function taskBudgetSummary(allocation: string, payments: Array<{ state: string; amount: string }>) {
  let spent = 0n;
  let reserved = 0n;
  for (const payment of payments) {
    if (payment.state === "settled") spent += BigInt(payment.amount);
    if (payment.state === "reserved" || payment.state === "settlement_pending") reserved += BigInt(payment.amount);
  }
  return { spent: unitsToToken(String(spent)), reserved: unitsToToken(String(reserved)), remaining: unitsToToken(String(BigInt(allocation) - spent - reserved)) };
}
