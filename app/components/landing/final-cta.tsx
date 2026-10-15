import Link from "next/link";

export function FinalCta() {
  return (
    <section className="landing-final-cta">
      <span className="eyebrow">Ready on devnet</span><h2>Give agents a budget.<br /><em>Keep the authority.</em></h2>
      <p>Connect a Solana wallet to use the live flow, or explore the policy model without signing anything.</p>
      <div className="landing-actions"><Link className="landing-primary-action" href="/app">Launch app <span aria-hidden="true">↗</span></Link><Link className="landing-secondary-action" href="/demo">Open simulated demo <span aria-hidden="true">→</span></Link></div>
    </section>
  );
}
