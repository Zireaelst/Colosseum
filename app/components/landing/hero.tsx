import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "./hero-video";

export function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <Image alt="" aria-hidden="true" className="landing-hero-background" fill priority sizes="100vw" src="/brand/hero-background.svg" />
      <HeroVideo />
      <div className="landing-hero-veil" aria-hidden="true" />
      <div className="landing-hero-copy">
        <span className="landing-kicker"><i /> Task-scoped payment authority</span>
        <h1 id="landing-title">
          Let agents pay.
          <em>You set the limits.</em>
        </h1>
        <p>Delegate bounded budgets, approved services, and deadlines. Pactlet checks authority before an agent payment is signed.</p>
        <div className="landing-actions">
          <Link className="landing-primary-action" href="/app">Launch devnet app <span aria-hidden="true">↗</span></Link>
          <Link className="landing-secondary-action" href="/demo">See it in action <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="landing-hero-facts" aria-label="Product boundaries">
        <span><i aria-hidden="true">01</i><strong>Scoped authority</strong><small>Budget · service · expiry</small></span>
        <span><i aria-hidden="true">02</i><strong>Pre-signature policy</strong><small>Reject before broadcast</small></span>
        <span><i aria-hidden="true">03</i><strong>Solana devnet receipts</strong><small>Signature when confirmed</small></span>
      </div>
    </section>
  );
}
