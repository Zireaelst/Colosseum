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
        <span className="badge"><i /> Devnet-only interactive MVP</span>
        <h1>Delegate authority.<br /><em>Keep the limits.</em></h1>
        <p>Prove wallet ownership, create a 10 test-USDC task, then inspect the exact payer, mint, amount, and recipient before approving any transfer.</p>
      </header>

      <section className="app-panel">
        <div className="app-panel-heading">
          <div><span className="eyebrow">01 / Connect</span><h2>Start a bounded task</h2></div>
          <span className="status-pill warning">Trusted backend</span>
        </div>
        <WalletConnect />
      </section>

      <p className="app-footnote">No mainnet funds. No agent-held private keys. Policy is backend-enforced; Solana devnet proves only the signed transfer.</p>
    </main>
  );
}
