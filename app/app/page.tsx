import Link from "next/link";

import { WalletConnect } from "../wallet-connect";

export default function PactletApp() {
  return (
    <main className="app-shell">
      <nav className="site-nav app-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Pactlet</span></Link>
        <Link className="text-link" href="/">← Back to overview</Link>
      </nav>

      <header className="app-header">
        <span className="badge"><i /> Live product · Solana devnet</span>
        <h1>Delegate authority.<br /><em>Keep the limits.</em></h1>
        <p>Connect your Solana wallet, create a task-scoped budget, and run a bounded agent payment flow.</p>
      </header>

      <section className="app-panel">
        <div className="app-panel-heading">
          <div><span className="eyebrow">Pactlet application</span><h2>Connect your Solana wallet</h2></div>
          <span className="status-pill warning">Devnet only</span>
        </div>
        <WalletConnect />
      </section>

      <p className="app-footnote">No mainnet funds. No agent-held private keys. Policy is backend-enforced; Solana devnet proves only the signed transfer.</p>
    </main>
  );
}
