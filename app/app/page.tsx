import Link from "next/link";

import { DemoModes } from "../components/public-demo";

export default function PactletApp() {
  return (
    <main className="app-shell">
      <nav className="site-nav app-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Pactlet</span></Link>
        <Link className="text-link" href="/">← Back to overview</Link>
      </nav>

      <header className="app-header">
        <span className="badge"><i /> Public walkthrough + live devnet</span>
        <h1>Delegate authority.<br /><em>Keep the limits.</em></h1>
        <p>Walk through Pactlet instantly in simulation mode, or switch to Live Devnet to inspect the wallet-backed integration boundary.</p>
      </header>

      <section className="app-panel">
        <div className="app-panel-heading">
          <div><span className="eyebrow">Interactive product demo</span><h2>Choose a demo mode</h2></div>
          <span className="status-pill warning">Devnet only</span>
        </div>
        <DemoModes />
      </section>

      <p className="app-footnote">No mainnet funds. No agent-held private keys. Policy is backend-enforced; Solana devnet proves only the signed transfer.</p>
    </main>
  );
}
