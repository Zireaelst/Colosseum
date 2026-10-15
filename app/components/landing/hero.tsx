import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <Image alt="" aria-hidden="true" className="landing-hero-background" fill priority sizes="100vw" src="/brand/hero-background.svg" />
      <div className="landing-hero-grid" aria-hidden="true" />
      <div className="landing-hero-copy">
        <span className="landing-kicker"><i /> Permission before payment</span>
        <h1 id="landing-title">Let agents pay.<em>You set the limits.</em></h1>
        <p>Give every AI task a bounded budget, approved services, and an expiry. Pactlet checks that authority at the x402 payment boundary.</p>
        <div className="landing-actions">
          <Link className="landing-primary-action" href="/app">Launch devnet app <span aria-hidden="true">↗</span></Link>
          <Link className="landing-secondary-action" href="/demo">Try guided demo <span aria-hidden="true">→</span></Link>
        </div>
        <div className="landing-hero-facts" aria-label="Product boundaries">
          <span><i /> Solana devnet</span><span><i /> x402 V2 exact</span><span><i /> No agent-held keys</span>
        </div>
      </div>
      <div className="landing-hero-card" aria-label="Example delegated budget">
        <div className="landing-hero-card-head"><span>Task authority</span><strong>10 test USDC</strong></div>
        <div className="landing-authority-root"><span>You</span><small>Owner-approved task</small></div>
        <div className="landing-authority-branch" aria-hidden="true" />
        <div className="landing-agent-grid">
          <article><span>Research</span><strong>4 USDC</strong><small>research-api</small></article>
          <article><span>Analysis</span><strong>3 USDC</strong><small>analysis-api</small></article>
        </div>
      </div>
      <a className="landing-scroll-cue" href="#problem">Explore the product <span aria-hidden="true">↓</span></a>
    </section>
  );
}
