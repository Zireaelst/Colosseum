import type { Metadata } from "next";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { WalletConnect } from "../wallet-connect";

export const metadata: Metadata = {
  title: "Pactlet App — Live Solana devnet flow",
  description: "Create and fund a task-scoped authority for a bounded AI agent payment on Solana devnet.",
};

export default function PactletApp() {
  return (
    <div className="product-page-shell" data-theme="pactlet-vesper">
      <a className="skip-link" href="#app-content">Skip to application</a>
      <SiteHeader />
      <main className="app-shell" id="app-content">
        <header className="app-header">
          <span className="badge"><i /> Live product · Solana devnet</span>
          <h1>Delegate authority.<br /><em>Keep the limits.</em></h1>
          <p>Connect your Solana wallet, create a task-scoped budget, and run a bounded agent payment flow on devnet.</p>
        </header>

        <section className="app-panel">
          <div className="app-panel-heading">
            <div><span className="eyebrow">Pactlet application</span><h2>Start the live flow</h2></div>
            <span className="status-pill warning">Devnet only</span>
          </div>
          <WalletConnect />
        </section>

        <p className="app-footnote">No mainnet funds. No agent-held private keys. Policy is backend-enforced; Solana devnet proves only the signed transfer.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
