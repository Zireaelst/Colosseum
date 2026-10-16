import type { TaskHistoryEntry } from "./task-history";

export function filterTaskHistory(entries: TaskHistoryEntry[], query: string, status: string) {
  const needle = query.trim().toLowerCase();
  return entries.filter(entry => {
    if (status === "funded" && !entry.fundingSignature) return false;
    if (status === "unfunded" && entry.fundingSignature) return false;
    return [entry.id, entry.paymentAddress, entry.fundingSignature ?? ""].some(value => value.toLowerCase().includes(needle));
  });
}

interface SearchablePayment {
  id: string;
  state: string;
  serviceId: string;
  resourceId: string;
  purchaseRef: string;
  rejectionCode: string | null;
  transactionSignature: string | null;
}

export function paymentHistoryPage<T extends SearchablePayment>(payments: T[], status: string, query: string, requestedPage: number) {
  const needle = query.trim().toLowerCase();
  const matches = payments.filter(payment => {
    if (status === "pending" && !["reserved", "settlement_pending"].includes(payment.state)) return false;
    if (["settled", "rejected", "failed"].includes(status) && payment.state !== status) return false;
    return [payment.id, payment.serviceId, payment.resourceId, payment.purchaseRef, payment.rejectionCode ?? "", payment.transactionSignature ?? ""].some(value => value.toLowerCase().includes(needle));
  }).reverse();
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(pages, requestedPage)) : 1;
  return { items: matches.slice((page - 1) * 20, page * 20), total: matches.length, page, pages };
}

export function replaceFilterQuery(href: string, changes: Record<string, string>, defaults: Record<string, string>): URL {
  const url = new URL(href);
  for (const [key, value] of Object.entries(changes)) {
    if (!value || value === defaults[key]) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return url;
}

const rejectionReasons: Record<string, string> = {
  BUDGET_EXCEEDED: "This request exceeds the specialist’s available budget. Reduce the request or create a new task with appropriate permissions.",
  PURCHASE_LIMIT_EXCEEDED: "This price exceeds the task’s per-purchase limit. Review the task permissions before requesting this service again.",
  SERVICE_NOT_ALLOWED: "The specialist is not authorized to pay for this service. Use a service in its allowlist.",
  SERVICE_NOT_CONFIGURED: "This service is not available in the configured merchant catalog.",
  RESOURCE_NOT_ALLOWED: "This product is outside the task’s approved scope. Review the allowed product.",
  AUTHORITY_CANCELLED: "This authority has been cancelled. Create a new task if you want to authorize more research.",
  AUTHORITY_EXPIRED: "The permission window has expired. Create a new task with a fresh expiry.",
  IDEMPOTENCY_CONFLICT: "This purchase reference was already used with different terms. Review the original attempt before authorizing another purchase.",
  INVALID_AMOUNT: "The requested amount is invalid. Review the merchant’s payment terms.",
  WRONG_MINT: "The merchant requested a token outside this task’s approved mint.",
  WRONG_NETWORK: "The merchant requested a network outside Solana devnet.",
  WRONG_RECIPIENT: "The recipient does not match the configured merchant.",
  AMOUNT_EXCEEDS_BUDGET: "The merchant’s requested amount exceeds the specialist’s current available budget.",
  WRONG_VERSION: "This merchant did not request x402 V2. The configured payment path accepts V2 only.",
  WRONG_SCHEME: "This merchant did not request the supported exact payment scheme.",
  SERVICE_MISMATCH: "The requested service does not match the configured merchant endpoint.",
};

export function explainPaymentDecision(state: string, rejectionCode: string | null): string {
  if (state === "settlement_pending" || state === "reserved") return "This payment is not confirmed. Its budget remains reserved until the outcome is reconciled; do not authorize a replacement payment.";
  if (state === "settled") return "The backend recorded a confirmed settlement. Inspect the transaction signature in Solana devnet Explorer for the chain record.";
  if (rejectionCode && Object.hasOwn(rejectionReasons, rejectionCode)) return rejectionReasons[rejectionCode];
  if (state === "failed") return "The backend recorded a definite failure. Review the recorded failure code and current budget before deciding whether to retry.";
  return "Review the recorded decision code and this task’s permissions before requesting another purchase.";
}
