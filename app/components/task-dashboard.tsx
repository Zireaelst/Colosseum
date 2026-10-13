"use client";

import { useMemo, useState } from "react";

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
    merchantPreview: null | { serviceId: string; amount: string; mint: string; payTo: string };
  };
  fundingState: "idle" | "signing" | "confirming" | "confirmed";
  fundingSignature: string | null;
  actionPending: boolean;
  agentResult: AgentRunView | null;
  onFund(): void;
  onRun(prompt: string): void;
  onCancel(): void;
}

const defaultPrompt = "Research the paid demo source and summarize the finding.";

export function TaskDashboard(props: TaskDashboardProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const view = useMemo(() => toTaskViewModel(props.snapshot), [props.snapshot]);
  const readiness = Object.entries(props.snapshot.readiness);
  const funded = props.fundingState === "confirmed";

  return (
    <div className="dashboard">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Live task control</span>
          <h2>Budget authority</h2>
        </div>
        <span className={`status-pill ${funded ? "success" : "warning"}`}>
          {funded ? "funded" : "awaiting devnet funding"}
        </span>
      </div>

      <div className="readiness" aria-label="Runtime readiness">
        {readiness.map(([name, ready]) => (
          <span className={`readiness-chip ${ready ? "ready" : "missing"}`} key={name}>
            <i /> {name} {ready ? "ready" : "not configured"}
          </span>
        ))}
      </div>

      <div className="card-grid">
        <article className="card task-card">
          <h3>Funding preview</h3>
          <dl>
            <div><dt>Network</dt><dd>Solana devnet</dd></div>
            <div><dt>Budget</dt><dd>10 test USDC</dd></div>
            <div><dt>Wallet payer</dt><dd><code>{props.ownerWallet}</code></dd></div>
            <div><dt>Task signer</dt><dd><code>{props.task.paymentAddress}</code></dd></div>
            <div><dt>Recipient ATA</dt><dd><code>{props.task.paymentAta}</code></dd></div>
            <div><dt>Mint</dt><dd><code>{props.task.mint}</code></dd></div>
          </dl>
          {!funded ? (
            <button
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
            <a className="explorer-link" href={`https://explorer.solana.com/tx/${props.fundingSignature}?cluster=devnet`} rel="noreferrer" target="_blank">
              {funded ? "View confirmed funding ↗" : "View pending funding ↗"}
            </a>
          ) : null}
        </article>

        <article className="card">
          <h3>Delegation tree</h3>
          <div className="delegation-tree">
            {view.delegations.map((delegation) => (
              <div className={`delegation depth-${delegation.depth}`} key={delegation.id}>
                <span className="node-line" />
                <div>
                  <div className="node-title">
                    <strong>{delegation.name}</strong>
                    <span className={`status-pill ${delegation.status === "active" ? "success" : "danger"}`}>{delegation.status}</span>
                  </div>
                  <div className="budget-meter"><i style={{ width: `${Math.min(100, Number(delegation.available) / Number(delegation.allocation) * 100)}%` }} /></div>
                  <small>{delegation.available} / {delegation.allocation} test USDC · {delegation.services.join(", ")}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="card-grid">
        <article className="card agent-console">
          <div className="panel-heading">
            <div><span className="eyebrow">Manager</span><h3>Run bounded agent</h3></div>
            <span className="status-pill">Groq free</span>
          </div>
          <textarea maxLength={2000} onChange={(event) => setPrompt(event.target.value)} rows={4} value={prompt} />
          <div className="actions">
            <button disabled={!funded || props.actionPending || !prompt.trim()} onClick={() => props.onRun(prompt)} type="button">
              {props.actionPending ? "Running…" : "Route & run"}
            </button>
            <button className="secondary" disabled={props.actionPending} onClick={props.onCancel} type="button">Cancel research authority</button>
          </div>
          {!funded ? <small>Fund the task before an agent can request a paid service.</small> : null}
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

        <article className="card activity-card">
          <h3>Payments & policy events</h3>
          {props.snapshot.merchantPreview ? (
            <div className="payment-preview">
              <span className="status-pill warning">next x402 exact</span>
              <strong>{props.snapshot.merchantPreview.amount} base units</strong>
              <code>{props.snapshot.merchantPreview.mint} → {props.snapshot.merchantPreview.payTo}</code>
            </div>
          ) : <p className="empty">Merchant is not configured yet.</p>}
          {view.payments.length ? view.payments.map((payment) => (
            <div className="activity-row" key={payment.id}>
              <i className={payment.tone} />
              <div>
                <strong>{payment.serviceId} · {payment.amount} test USDC</strong>
                <small>{payment.label}</small>
                {payment.explorerUrl ? <a href={payment.explorerUrl} rel="noreferrer" target="_blank">Explorer ↗</a> : null}
              </div>
            </div>
          )) : <p className="empty">No payment attempt yet.</p>}
          <div className="event-list">
            {view.events.slice(-6).reverse().map((event) => <code key={event.id}>{event.eventType}</code>)}
          </div>
        </article>
      </div>

      <p className="trust-note">Devnet proves token transfer and transaction signature. Delegation, service allowlists, expiry and cancellation are enforced by this trusted backend.</p>
    </div>
  );
}
