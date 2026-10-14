"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-shell">
      <section className="app-header">
        <span className="status-pill danger">Live app unavailable</span>
        <h1>The devnet flow<br /><em>could not load.</em></h1>
        <p>Your wallet has not been asked to approve a payment. Retry the application or use the simulation-only walkthrough.</p>
        <div className="hero-actions">
          <button onClick={reset} type="button">Try again</button>
          <Link className="text-link" href="/demo">Open guided demo →</Link>
        </div>
      </section>
    </main>
  );
}
