import Link from "next/link";

import { PublicDemo } from "../components/public-demo";

export default function DemoPage() {
  return (
    <main className="app-shell">
      <nav className="site-nav app-nav">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Pactlet</span></Link>
        <Link className="text-link" href="/app">Open real app →</Link>
      </nav>

      <header className="app-header">
        <span className="badge"><i /> Guided product demo</span>
        <h1>See the policy flow.<br /><em>No wallet required.</em></h1>
        <p>This deterministic walkthrough demonstrates delegation, payment approval, rejection, and cancellation without signing or broadcasting.</p>
      </header>

      <section className="app-panel">
        <div className="app-panel-heading">
          <div><span className="eyebrow">Guided product demo</span><h2>Permission before payment</h2></div>
          <span className="status-pill warning">Simulated</span>
        </div>
        <PublicDemo />
      </section>

      <p className="app-footnote">This route is simulation-only. Use the real app for wallet authentication and devnet evidence.</p>
    </main>
  );
}
