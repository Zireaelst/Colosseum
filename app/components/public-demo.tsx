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

export function PublicDemo() {
  const [state, dispatch] = useReducer(
    reducePublicDemo,
    undefined,
    createPublicDemoState,
  );
  const research = state.delegations.find(
    (delegation) => delegation.id === "research",
  );
  const hasAllowed = state.payments.some(
    (payment) => payment.id === "demo-allowed",
  );
  const hasOverBudget = state.payments.some(
    (payment) => payment.id === "demo-over-budget",
  );
  const isCancelled = research?.status === "cancelled";
  const hasPostCancel = state.payments.some(
    (payment) => payment.id === "demo-after-cancel",
  );

  return (
    <section aria-label="Simulated policy walkthrough" className="public-demo">
      <div className="simulation-banner">
        <span className="status-pill warning">SIMULATED</span>
        <div>
          <strong>Browser-only product walkthrough</strong>
          <p>
            This mode demonstrates Pactlet&apos;s policy behavior without a wallet,
            signature, token transfer, or backend state.
          </p>
        </div>
      </div>

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

      <div className="card-grid">
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
                      {shortAmount(delegation.available)} available / {shortAmount(delegation.allocation)} allocated
                    </small>
                    <code>{delegation.services.join(" · ")}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card demo-actions-card">
          <span className="eyebrow">Guided walkthrough</span>
          <h3>Permission before payment</h3>
          <p>Run the same sequence used in the three-minute product demo.</p>
          <div className="demo-action-list">
            <button
              disabled={hasAllowed || isCancelled}
              onClick={() => dispatch({ type: "allow_purchase" })}
              type="button"
            >
              1. Allow 0.001 USDC service
            </button>
            <button
              className="secondary"
              disabled={!hasAllowed || hasOverBudget}
              onClick={() => dispatch({ type: "reject_over_budget" })}
              type="button"
            >
              2. Attempt 5 USDC overspend
            </button>
            <button
              className="secondary"
              disabled={!hasOverBudget || isCancelled}
              onClick={() => dispatch({ type: "cancel_research" })}
              type="button"
            >
              3. Cancel research authority
            </button>
            <button
              className="secondary"
              disabled={!isCancelled || hasPostCancel}
              onClick={() => dispatch({ type: "reject_after_cancel" })}
              type="button"
            >
              4. Retry after cancellation
            </button>
          </div>
          <button
            className="reset-button"
            onClick={() => dispatch({ type: "reset" })}
            type="button"
          >
            Reset walkthrough
          </button>
        </article>
      </div>

      <div className="card-grid">
        <article className="card activity-card">
          <h3>Payment decisions</h3>
          {state.payments.length === 0 ? (
            <p className="empty">Run the first action to see a policy decision.</p>
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
                  <small>No transaction was signed or broadcast.</small>
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
