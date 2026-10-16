"use client";

import { useMemo } from "react";
import { explainPaymentDecision, paymentHistoryPage } from "../../src/ui/history-filters";
import type { toTaskViewModel } from "../../src/ui/task-view-model";
import { CopyableCode } from "./copyable-code";
import { useUrlFilters } from "./use-url-filters";

const defaults = { paymentStatus: "all", paymentQuery: "", paymentPage: "1" };
const statuses = { all: "All attempts", pending: "Pending", settled: "Settled", rejected: "Rejected", failed: "Failed" };
const stateLabels: Record<string, string> = { reserved: "Budget reserved", settlement_pending: "Settlement pending", settled: "Settled", rejected: "Rejected", failed: "Failed" };

export function PaymentHistory({ payments }: { payments: ReturnType<typeof toTaskViewModel>["payments"] }) {
  const [filters, setFilters] = useUrlFilters(defaults);
  const status = Object.hasOwn(statuses, filters.paymentStatus) ? filters.paymentStatus : "all";
  const page = useMemo(() => paymentHistoryPage(payments, status, filters.paymentQuery, Number(filters.paymentPage)), [payments, status, filters.paymentQuery, filters.paymentPage]);

  return <section className="payment-history" aria-label="Payment history">
    <div className="history-filter-bar"><label>Search payments<input type="search" name="paymentQuery" value={filters.paymentQuery} onChange={event => setFilters({ paymentQuery: event.target.value, paymentPage: "1" })} placeholder="Service, reference, decision code…" maxLength={160} autoComplete="off" spellCheck={false} /></label><label>Payment status<select aria-label="Payment status" name="paymentStatus" value={status} onChange={event => setFilters({ paymentStatus: event.target.value, paymentPage: "1" })}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    <p className="payment-result-count" aria-live="polite">{new Intl.NumberFormat().format(page.total)} matching {page.total === 1 ? "attempt" : "attempts"}</p>
    {page.items.length === 0 ? <div className="payment-empty"><p>{payments.length === 0 ? "No payment attempts yet. Once the task is funded, run an agent to see its payment decisions here." : "No attempts match these filters."}</p>{payments.length > 0 ? <button className="secondary" type="button" onClick={() => setFilters(defaults)}>Clear payment filters</button> : null}</div> : page.items.map(payment => <article className="payment-attempt" key={payment.id}>
      <div className="payment-attempt-heading"><div><strong>{payment.serviceId}</strong><span>{payment.resourceId}</span></div><span className={`status-pill ${payment.state === "failed" ? "danger" : payment.tone}`}>{stateLabels[payment.state] ?? "Unknown outcome"}</span></div>
      <p className="payment-attempt-amount">{payment.amount} <span>test USDC</span></p>
      <details className="payment-receipt"><summary>Details & receipt</summary><p>{explainPaymentDecision(payment.state, payment.rejectionCode)}</p>{payment.rejectionCode ? <p className="payment-decision-code">Decision code: <code>{payment.rejectionCode}</code></p> : null}<span className="receipt-label">Purchase reference</span><CopyableCode label="purchase reference" value={payment.purchaseRef} />{payment.transactionSignature ? <><span className="receipt-label">Transaction signature</span><CopyableCode label="transaction signature" value={payment.transactionSignature} /><a className="explorer-link" href={payment.explorerUrl ?? undefined} rel="noreferrer" target="_blank">{payment.state === "settled" ? "View recorded settlement" : "View submitted transaction"} ↗</a></> : <p className="receipt-no-signature">No transaction signature recorded for this attempt.</p>}</details>
    </article>)}
    <div className="task-history-pagination"><button className="secondary" disabled={page.page <= 1} onClick={() => setFilters({ paymentPage: String(page.page - 1) })} type="button" aria-label="Previous payments">Previous</button><span>Page {page.page} of {page.pages}</span><button className="secondary" disabled={page.page >= page.pages} onClick={() => setFilters({ paymentPage: String(page.page + 1) })} type="button" aria-label="Next payments">Next</button></div>
  </section>;
}
