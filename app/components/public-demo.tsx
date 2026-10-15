"use client";

import { useReducer } from "react";

import {
  createPublicDemoState,
  reducePublicDemo,
} from "../../src/demo/public-demo";
import { unitsToToken } from "../../src/ui/task-view-model";

function shortAmount(value: bigint): string {
  return `${unitsToToken(value.toString())} test USDC`;
}

const STEPS = [
  { id: "allow_purchase",    label: "Allow 0.001 USDC service",  description: "Research agent pays within the allowed service budget." },
  { id: "reject_over_budget",label: "Attempt 5 USDC overspend",  description: "Policy rejects the request — exceeds delegated budget." },
  { id: "cancel_research",   label: "Cancel research authority",  description: "Research delegation cancelled by the task owner." },
  { id: "reject_after_cancel",label: "Retry after cancellation", description: "Any purchase attempt is rejected due to cancellation." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function PublicDemo() {
  const [state, dispatch] = useReducer(
    reducePublicDemo,
    undefined,
    createPublicDemoState,
  );

  const research = state.delegations.find((d) => d.id === "research");
  const hasAllowed    = state.payments.some((p) => p.id === "demo-allowed");
  const hasOverBudget = state.payments.some((p) => p.id === "demo-over-budget");
  const isCancelled   = research?.status === "cancelled";
  const hasPostCancel = state.payments.some((p) => p.id === "demo-after-cancel");

  // Completed step count for dots
  const completedCount =
    (hasAllowed ? 1 : 0) +
    (hasOverBudget ? 1 : 0) +
    (isCancelled ? 1 : 0) +
    (hasPostCancel ? 1 : 0);

  const isStepEnabled = (id: StepId): boolean => {
    switch (id) {
      case "allow_purchase":     return !hasAllowed && !isCancelled;
      case "reject_over_budget": return hasAllowed && !hasOverBudget;
      case "cancel_research":    return hasOverBudget && !isCancelled;
      case "reject_after_cancel":return isCancelled && !hasPostCancel;
    }
  };

  return (
    <section aria-label="Simulated policy walkthrough" className="public-demo">
      {/* Banner */}
      <div className="simulation-banner">
        <span className="status-pill warning">Simulated</span>
        <div>
          <strong>Browser-only product walkthrough</strong>
          <p>
            This mode demonstrates Pactlet&apos;s policy behavior without a wallet,
            signature, token transfer, or backend state.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="demo-summary">
        <article>
          <span>Task budget</span>
          <strong>{shortAmount(state.taskAllocation)}</strong>
        </article>
        <article>
          <span>Delegated</span>
          <strong>4 + 3 test USDC</strong>
        </article>
        <article>
          <span>Policy</span>
          <strong>Backend enforced</strong>
        </article>
      </div>

      {/* Main grid */}
      <div className="card-grid">
        {/* Delegation graph */}
        <article className="card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Delegation graph</span>
              <h3>Authority narrows downward</h3>
            </div>
            <span className="status-pill success">10 / 4 / 3</span>
          </div>
          <div className="delegation-tree">
            {state.delegations.map((delegation) => {
              const ratio = Number(
                (delegation.available * 100n) / delegation.allocation,
              );
              return (
                <div
                  className={`delegation ${delegation.parentId ? "depth-1" : "depth-0"}`}
                  key={delegation.id}
                >
                  <span className="node-line" />
                  <div>
                    <div className="node-title">
                      <strong>{delegation.name}</strong>
                      <span
                        className={`status-pill ${delegation.status === "active" ? "success" : "danger"}`}
                      >
                        {delegation.status}
                      </span>
                    </div>
                    <div className="budget-meter">
                      <i style={{ width: `${ratio}%` }} />
                    </div>
                    <small>
                      {shortAmount(delegation.available)} available /{" "}
                      {shortAmount(delegation.allocation)} allocated
                    </small>
                    <code>{delegation.services.join(" · ")}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Guided walkthrough */}
        <article className="card demo-actions-card">
          <span className="eyebrow">Guided walkthrough</span>
          <h3>Permission before payment</h3>
          <p>Run the same four-step sequence used in the product demo.</p>

          {/* Step progress dots */}
          <div className="step-dots" aria-label="Progress">
            {STEPS.map((step, i) => {
              const done = i < completedCount;
              const current = i === completedCount && completedCount < STEPS.length;
              return (
                <div
                  className={`step-dot ${done ? "done" : ""} ${current ? "current" : ""}`}
                  key={step.id}
                  title={step.label}
                />
              );
            })}
          </div>

          <div className="demo-action-list">
            {STEPS.map((step, i) => {
              const enabled = isStepEnabled(step.id);
              const done = i < completedCount;
              return (
                <button
                  className={i === 0 ? undefined : "secondary"}
                  disabled={!enabled && !done}
                  key={step.id}
                  onClick={() => enabled && dispatch({ type: step.id })}
                  style={{ opacity: done ? 0.45 : undefined, cursor: done ? "default" : undefined }}
                  type="button"
                >
                  <span style={{ minWidth: "1.2em", opacity: done ? 1 : 0.6 }}>
                    {done ? "✓" : `${i + 1}.`}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
          <button
            className="reset-button"
            onClick={() => dispatch({ type: "reset" })}
            type="button"
          >
            ↺ Reset walkthrough
          </button>
        </article>
      </div>

      {/* Results grid */}
      <div className="card-grid">
        <article className="card activity-card">
          <h3>Payment decisions</h3>
          {state.payments.length === 0 ? (
            <p className="empty">Run step 1 to see a policy decision.</p>
          ) : (
            state.payments.map((payment) => (
              <div className="activity-row" key={payment.id}>
                <i className={payment.state === "settled" ? "success" : "danger"} />
                <div>
                  <strong>
                    {payment.serviceId} · {shortAmount(payment.amount)}
                  </strong>
                  <small>
                    SIMULATED · {payment.state.toUpperCase()}
                    {payment.rejectionCode ? ` · ${payment.rejectionCode}` : ""}
                  </small>
                  <small style={{ opacity: .6 }}>No transaction was signed or broadcast.</small>
                </div>
              </div>
            ))
          )}
        </article>

        <article className="card activity-card">
          <h3>Policy event log</h3>
          <div className="demo-event-list">
            {[...state.events].reverse().map((event) => (
              <div key={event.id}>
                <code>{event.eventType}</code>
                <small>{event.detail}</small>
              </div>
            ))}
            {state.events.length === 0 && (
              <p className="empty">Events will appear here as you progress.</p>
            )}
          </div>
        </article>
      </div>

      <p className="trust-note">
        Public Demo is a deterministic simulation. Live Devnet is the only mode
        that can create Solana evidence, and no real settlement is claimed until
        a confirmed Explorer signature exists.
      </p>
    </section>
  );
}
