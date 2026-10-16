"use client";

import { useMemo, useState } from "react";
import { hasUnresolvedPurchase, taskBudgetSummary } from "../../src/ui/task-summary";
import { CopyableCode } from "./copyable-code";
import { PaymentHistory } from "./payment-history";

import {
  toTaskViewModel,
  type TaskSnapshotDto,
} from "../../src/ui/task-view-model";

export interface AgentRunView {
  routing: { source: string; route: string; confidence: number | null };
  executionMode: string;
  provider: string | null;
  model: string | null;
  output: string;
}

interface TaskDashboardProps {
  task: {
    id: string;
    paymentAddress: string;
    paymentAta: string;
    mint: string;
    allocation: string;
  };
  ownerWallet: string;
  snapshot: TaskSnapshotDto & {
    readiness: { ai: boolean; jev: boolean; merchant: boolean; rpc: boolean };
    merchantPreview: null | { serviceId: string; resourceId: string; amount: string; mint: string; payTo: string };
  };
  fundingState: "idle" | "signing" | "confirming" | "confirmed";
  fundingSignature: string | null;
  actionPending: boolean;
  agentResult: AgentRunView | null;
  onFund(): void;
  onRun(prompt: string): void;
  onCancel(): void;
  onRefresh(): void;
  refreshing: boolean;
  retryPurchaseRef?: string;
}

const defaultPrompt = "Research the paid demo source and summarize the finding.";

export function TaskDashboard(props: TaskDashboardProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const view    = useMemo(() => toTaskViewModel(props.snapshot), [props.snapshot]);
  const readiness = Object.entries(props.snapshot.readiness);
  const funded  = props.fundingState === "confirmed";
  const totals = taskBudgetSummary(props.task.allocation, props.snapshot.payments);
  const unresolvedPurchase = hasUnresolvedPurchase(props.snapshot.payments, props.retryPurchaseRef);
  const [exportError, setExportError] = useState<string | null>(null);

  function exportTask() {
    setExportError(null);
    try {
      const receipt = {
        product: "Pactlet",
        network: "Solana devnet",
        enforcement: "Trusted backend; custodial prototype",
        taskId: props.task.id,
        purpose: view.mandate.purpose,
        mint: props.task.mint,
        allocationBaseUnits: props.task.allocation,
        fundingSignature: props.fundingSignature,
        fundingStatus: props.fundingState,
        payments: props.snapshot.payments.map(payment => ({ id: payment.id, serviceId: payment.serviceId, resourceId: payment.resourceId, amountBaseUnits: payment.amount, state: payment.state, rejectionCode: payment.rejectionCode, transactionSignature: payment.transactionSignature })),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pactlet-task-${props.task.id}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError("Could not export this task. Please try again."); }
  }

  return (
    <div className="dashboard">
      {/* ── Header row ── */}
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Live task control</span>
          <h2>Budget authority</h2>
        </div>
        <div className="task-dashboard-tools"><span className={`status-pill ${funded ? "success" : "warning"}`}>{funded ? "Funding confirmed" : props.fundingState === "confirming" ? "Confirmation pending" : "Awaiting funding"}</span><button className="secondary" aria-busy={props.refreshing} disabled={props.refreshing || props.actionPending || props.fundingState === "signing"} onClick={props.onRefresh} type="button">Refresh status</button></div>
      </div>

      <div className="task-title-row"><div><h3>{view.mandate.purpose}</h3><code translate="no">{props.task.id}</code></div><button className="secondary" onClick={exportTask} type="button">Export task ↓</button></div>
      {exportError ? <p aria-live="polite" className="error">{exportError}</p> : null}
      <dl className="task-summary-grid"><div><dt>Settled spend</dt><dd>{totals.spent}<span>test USDC</span></dd></div><div><dt>Reserved / pending</dt><dd>{totals.reserved}<span>test USDC</span></dd></div><div><dt>Unspent, unreserved</dt><dd>{totals.remaining}<span>test USDC</span></dd></div></dl>
      <p className="task-summary-note">Task totals include delegated budgets. Each specialist’s available amount is shown in the delegation tree.</p>
      {props.snapshot.task.expiresAt ? <p className="task-summary-note">Permission expires <time dateTime={new Date(props.snapshot.task.expiresAt).toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(props.snapshot.task.expiresAt)}</time>.</p> : null}

      {/* ── Runtime readiness chips ── */}
      <div className="readiness" aria-label="Runtime readiness">
        {readiness.map(([name, ready]) => (
          <span className={`readiness-chip ${ready ? "ready" : "missing"}`} key={name}>
            <i />
            {name} {ready ? "ready" : "not configured"}
          </span>
        ))}
      </div>

      {/* ── Row 1: Funding + Delegation ── */}
      <div className="card-grid">
        {/* Funding card */}
        <article className="card task-card">
          <h3>Funding preview</h3>
          <dl>
            <div><dt>Task purpose</dt><dd>{view.mandate.purpose}</dd></div>
            <div><dt>Allowed product</dt><dd><code>{view.mandate.serviceId} / {view.mandate.resourceId}</code></dd></div>
            <div><dt>Per purchase</dt><dd>up to {view.mandate.maxAmount} test USDC</dd></div>
            <div><dt>Network</dt><dd>Solana devnet</dd></div>
            <div><dt>Budget</dt><dd>10 test USDC</dd></div>
            <div><dt>Funding amount</dt><dd>{props.task.allocation} base units</dd></div>
            <div><dt>Wallet payer</dt><dd><code>{props.ownerWallet}</code></dd></div>
            <div><dt>Task signer</dt><dd><CopyableCode label="task payment address" value={props.task.paymentAddress} /></dd></div>
            <div><dt>Recipient ATA</dt><dd><CopyableCode label="recipient token account" value={props.task.paymentAta} /></dd></div>
            <div><dt>Mint</dt><dd><CopyableCode label="token mint" value={props.task.mint} /></dd></div>
          </dl>

          {!funded ? (
            <button
              aria-busy={props.fundingState === "signing" || props.fundingState === "confirming"}
              disabled={props.fundingState !== "idle"}
              onClick={props.onFund}
              type="button"
            >
              {props.fundingState === "idle"
                ? "Confirm preview & fund on devnet"
                : props.fundingState === "signing"
                  ? "Approve in wallet…"
                  : "Confirming on devnet…"}
            </button>
          ) : null}

          {props.fundingSignature ? (
            <a
              className="explorer-link"
              href={`https://explorer.solana.com/tx/${props.fundingSignature}?cluster=devnet`}
              rel="noreferrer"
              target="_blank"
            >
              {funded ? "View confirmed funding ↗" : "View pending funding ↗"}
            </a>
          ) : null}
          {props.fundingState === "confirming" ? <p className="pending-funding-note">Your transaction was submitted. Use Refresh status to check it again; this will not send another transfer.</p> : null}
        </article>

        {/* Delegation tree */}
        <article className="card">
          <h3>Delegation tree</h3>
          <div className="delegation-tree">
            {view.delegations.map((delegation) => {
              const pct = Math.min(
                100,
                Number(delegation.available) / Number(delegation.allocation) * 100,
              );
              return (
                <div className={`delegation depth-${delegation.depth}`} key={delegation.id}>
                  <span className="node-line" />
                  <div>
                    <div className="node-title">
                      <strong>{delegation.name}</strong>
                      <span className={`status-pill ${delegation.status === "active" ? "success" : "danger"}`}>
                        {delegation.status}
                      </span>
                    </div>
                    <div className="budget-meter">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <small>
                      {delegation.available} / {delegation.allocation} test USDC
                      {" · "}
                      {delegation.services.join(", ")}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {/* ── Row 2: Agent console + Activity ── */}
      <div className="card-grid">
        {/* Agent console */}
        <article className="card agent-console">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Manager</span>
              <h3>Run bounded agent</h3>
            </div>
            <span className="status-pill">Groq free</span>
          </div>
          <textarea
            aria-label="Agent instructions"
            name="agentPrompt"
            maxLength={2000}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && funded && !unresolvedPurchase && !props.actionPending && prompt.trim()) { event.preventDefault(); props.onRun(prompt.trim()); } }}
            rows={4}
            value={prompt}
          />
          <div className="actions">
            <button
              aria-busy={props.actionPending}
              disabled={!funded || unresolvedPurchase || props.actionPending || !prompt.trim()}
              onClick={() => props.onRun(prompt)}
              type="button"
            >
              Route & run
            </button>
            <button
              className="secondary"
              disabled={props.actionPending}
              onClick={props.onCancel}
              type="button"
            >
              Cancel research authority
            </button>
          </div>
          {!funded ? (
            <small>Fund the task before an agent can request a paid service.</small>
          ) : null}
          {unresolvedPurchase ? <small>A purchase result is pending. Inspect its receipt before starting another run; its reserved budget remains held.</small> : null}
          {props.agentResult ? (
            <div className="agent-result">
              <div className="run-meta">
                <span>{props.agentResult.executionMode}</span>
                <span>{props.agentResult.routing.source} → {props.agentResult.routing.route}</span>
                <span>{props.agentResult.model ?? "no model"}</span>
              </div>
              <p>{props.agentResult.output}</p>
            </div>
          ) : null}
        </article>

        {/* Activity + payments */}
        <article className="card activity-card">
          <h3>Payments & policy events</h3>
          {props.snapshot.merchantPreview ? (
            <div className="payment-preview">
              <span className="status-pill warning">next x402 exact</span>
              <strong>{props.snapshot.merchantPreview.amount} base units</strong>
              <code>{props.snapshot.merchantPreview.serviceId} / {props.snapshot.merchantPreview.resourceId}</code>
              <code>{props.snapshot.merchantPreview.mint} → {props.snapshot.merchantPreview.payTo}</code>
            </div>
          ) : (
            <p className="empty">Merchant is not configured yet.</p>
          )}

          <PaymentHistory payments={view.payments} />

          <div className="event-list">
            {view.events.slice(-6).reverse().map((event) => (
              <code key={event.id}>{event.eventType}</code>
            ))}
          </div>
        </article>
      </div>

      <p className="trust-note">
        Devnet proves token transfer and transaction signature. Delegation, service allowlists,
        expiry, and cancellation are enforced by this trusted backend.
      </p>
    </div>
  );
}
