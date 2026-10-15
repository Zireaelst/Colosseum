import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Pactlet Docs — Devnet quick start",
  description: "Quick start, trust boundaries, and public API flow for the Pactlet Solana devnet MVP.",
};

const quickStart = [
  ["Connect", "Connect a Wallet Standard Solana wallet and sign the ownership nonce."],
  ["Create", "Describe the task and create its disposable backend-held payment account."],
  ["Fund", "Review payer, mint, base-unit amount, and recipient before signing on devnet."],
  ["Run", "Let the manager route a bounded request to the research or analysis agent."],
  ["Inspect", "Review delegations, decisions, remaining budget, and any confirmed Explorer signature."],
] as const;

const environmentNames = [
  "NEXT_PUBLIC_APP_ORIGIN",
  "PACTLET_SESSION_SECRET",
  "PACTLET_SIGNER_MASTER_KEY",
  "SOLANA_DEVNET_RPC_URL",
  "SOLANA_DEVNET_TOKEN_MINT",
  "X402_FACILITATOR_URL",
  "X402_MERCHANT_URL",
  "X402_MERCHANT_PAY_TO",
  "AI_API_KEY",
  "TYPESAFE_API_KEY",
] as const;

const routes = [
  ["POST", "/api/auth/nonce", "Create a short-lived wallet ownership challenge."],
  ["POST", "/api/auth/verify", "Verify the wallet signature and create the server session."],
  ["POST", "/api/tasks", "Create a task and its narrower manager/specialist delegations."],
  ["POST", "/api/tasks/:id/funding-transaction", "Build the reviewed devnet funding transaction."],
  ["POST", "/api/tasks/:id/run", "Route the prompt and execute the bounded purchase flow."],
  ["POST", "/api/tasks/:id/cancel", "Block new reservations for the research delegation."],
] as const;

export default function DocsPage() {
  return (
    <div className="product-page-shell docs-page">
      <a className="skip-link" href="#docs-content">Skip to documentation</a>
      <SiteHeader />
      <header className="docs-hero">
        <span className="eyebrow">Pactlet documentation</span>
        <h1>Build with bounded<br /><em>agent authority.</em></h1>
        <p>A concise guide to the live Solana devnet flow, simulated walkthrough, and trusted backend boundary.</p>
        <div className="docs-status-row">
          <span><i /> Solana devnet only</span>
          <span>Custodial prototype</span>
          <span>Backend-enforced policy</span>
        </div>
      </header>

      <main className="docs-layout" id="docs-content">
        <aside className="docs-sidebar">
          <span>On this page</span>
          <a href="#overview">Overview</a>
          <a href="#quick-start">Quick start</a>
          <a href="#modes">Live vs simulated</a>
          <a href="#readiness">Runtime readiness</a>
          <a href="#api">API flow</a>
          <a href="#trust">Trust boundary</a>
          <a href="#limitations">Limitations</a>
        </aside>

        <div className="docs-content">
          <section id="overview">
            <span className="eyebrow">Overview</span>
            <h2>Permission before payment</h2>
            <p>Pactlet gives each task a bounded budget, service allowlist, and expiry. A manager may delegate only narrower authority to specialist agents. The agents never receive a wallet key; they can only request purchases through the backend service.</p>
            <div className="docs-callout"><strong>Core invariant</strong><p>Available amount equals allocation minus settled spend, pending reservations, and active child allocations. Reservation and availability are updated in one database transaction.</p></div>
          </section>

          <section id="quick-start">
            <span className="eyebrow">Quick start</span>
            <h2>From wallet to bounded run</h2>
            <ol className="docs-steps">
              {quickStart.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}
            </ol>
            <div className="docs-actions"><Link className="landing-primary-action" href="/app">Open live app ↗</Link><Link className="landing-secondary-action" href="/demo">Open guided demo →</Link></div>
          </section>

          <section id="modes">
            <span className="eyebrow">Two product paths</span>
            <h2>Live and simulated stay separate</h2>
            <div className="docs-mode-grid">
              <article><strong>Live devnet app</strong><p>Uses a connected wallet, authenticated session, task account, and configured runtime. A signature is shown only after confirmation.</p><Link href="/app">Launch app →</Link></article>
              <article><strong>Simulated demo</strong><p>Runs entirely in the browser to explain allow, reject, cancel, and reject-after-cancel decisions. It signs and broadcasts nothing.</p><Link href="/demo">Try simulation →</Link></article>
            </div>
          </section>

          <section id="readiness">
            <span className="eyebrow">Runtime readiness</span>
            <h2>Configuration names</h2>
            <p>Set values in the deployment environment. Never put private values in browser variables, source control, screenshots, or chat.</p>
            <div className="docs-code-list">{environmentNames.map((name) => <code key={name}>{name}</code>)}</div>
          </section>

          <section id="api">
            <span className="eyebrow">Public application flow</span>
            <h2>Route overview</h2>
            <div className="docs-route-list">
              {routes.map(([method, route, description]) => <article key={route}><span>{method}</span><code>{route}</code><p>{description}</p></article>)}
            </div>
          </section>

          <section id="trust">
            <span className="eyebrow">Trust boundary</span>
            <h2>Backend-enforced, chain-verified</h2>
            <p>Budget, service, hierarchy, expiry, cancellation, and idempotency checks are backend-enforced. Solana devnet proves the token transfer and transaction signature. Pactlet does not describe the current MVP as trustless or onchain-enforced.</p>
            <a className="docs-source-link" href="https://github.com/Zireaelst/Colosseum/blob/main/docs/architecture.md" rel="noreferrer" target="_blank">Read the architecture source ↗</a>
          </section>

          <section id="limitations">
            <span className="eyebrow">MVP limitations</span>
            <h2>What production still needs</h2>
            <ul className="docs-limitations">
              <li>Dedicated signer and key-management infrastructure.</li>
              <li>A production custody and recovery model.</li>
              <li>Continuous reconciliation for unknown settlement states.</li>
              <li>Rate limiting, abuse controls, monitoring, and operational runbooks.</li>
              <li>Optional smart-account or onchain policy enforcement.</li>
            </ul>
            <a className="docs-source-link" href="https://explorer.solana.com/?cluster=devnet" rel="noreferrer" target="_blank">Open Solana devnet Explorer ↗</a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
