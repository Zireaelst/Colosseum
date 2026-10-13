import Image from "next/image";
import Link from "next/link";

const features = [
  {
    eyebrow: "01 / Budget control",
    title: "Spending stays within bounds.",
    body: "Every task and child agent receives an integer, token-denominated budget. Pending payments reserve capacity before a signer is touched.",
    image: "/brand/feature-budgets.svg",
  },
  {
    eyebrow: "02 / Delegation",
    title: "Authority with boundaries.",
    body: "A child can only narrow its parent: smaller budget, shorter expiry, and a strict subset of allowed services.",
    image: "/brand/feature-delegation.svg",
  },
  {
    eyebrow: "03 / Policy enforcement",
    title: "Rules checked before payment.",
    body: "Network, mint, recipient, service, amount, expiry, cancellation, and idempotency are verified before an x402 payment is signed.",
    image: "/brand/feature-policy.svg",
  },
];

export default function Home() {
  return (
    <main className="landing">
      <nav className="site-nav">
        <Link className="brand" href="/" aria-label="Pactlet home">
          <span className="brand-mark">P</span>
          <span>Pactlet</span>
        </Link>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="#architecture">Architecture</a>
          <Link className="nav-cta" href="/app">Launch demo</Link>
        </div>
      </nav>

      <section className="hero">
        <Image alt="" className="hero-background" fill priority src="/brand/hero-background.svg" />
        <div className="hero-copy">
          <span className="badge"><i /> Agent payments / Solana devnet</span>
          <h1>Let agents pay.<br /><em>You set the limits.</em></h1>
          <p>Task-scoped budgets, delegated authority, and policy checks enforced at the exact moment an AI agent attempts an x402 payment.</p>
          <div className="hero-actions">
            <Link className="primary-link" href="/app">Open the MVP <span>↗</span></Link>
            <a className="text-link" href="#architecture">See how it works ↓</a>
          </div>
          <div className="proof-row">
            <span><strong>x402 V2</strong> exact payments</span>
            <span><strong>10 / 4 / 3</strong> delegated budget</span>
            <span><strong>79 tests</strong> policy to settlement</span>
          </div>
        </div>
        <div className="hero-visual">
          <Image alt="A root task budget delegated to bounded specialist agents" height={900} priority src="/brand/delegation-illustration.svg" width={1400} />
        </div>
      </section>

      <section className="feature-section" id="product">
        <div className="section-intro">
          <span className="eyebrow">Permission before payment</span>
          <h2>Autonomy without an unlimited wallet.</h2>
          <p>Pactlet is a pluggable control boundary—not a marketplace and not an agent wallet. Agents only receive one server-bound purchase tool.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.eyebrow}>
              <Image alt="" height={600} src={feature.image} width={800} />
              <div>
                <span>{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="architecture-section" id="architecture">
        <div className="architecture-copy">
          <span className="eyebrow">Built for the payment boundary</span>
          <h2>One narrow path from agent intent to settlement.</h2>
          <ol>
            <li><span>01</span><div><strong>Route the task</strong><p>Manager selects a bounded research or analysis specialist.</p></div></li>
            <li><span>02</span><div><strong>Validate authority</strong><p>Trusted backend checks scope, remaining budget, expiry, and cancellation.</p></div></li>
            <li><span>03</span><div><strong>Reserve atomically</strong><p>SQLite prevents duplicate and concurrent overspend in the local MVP.</p></div></li>
            <li><span>04</span><div><strong>Settle on devnet</strong><p>x402 and Solana provide the payment transaction and Explorer signature.</p></div></li>
          </ol>
        </div>
        <Image alt="Illustrative Pactlet developer integration" height={680} src="/brand/developer-visual.svg" width={1100} />
      </section>

      <section className="trust-section">
        <span className="eyebrow">Honest trust boundary</span>
        <h2>Solana proves the transfer.<br />Pactlet enforces the policy.</h2>
        <p>This hackathon MVP is custodial, backend-enforced, and devnet-only. It does not claim trustless or onchain-enforced delegation.</p>
        <Link className="primary-link" href="/app">Run the public demo <span>↗</span></Link>
      </section>

      <footer>
        <Link className="brand" href="/"><span className="brand-mark">P</span><span>Pactlet</span></Link>
        <span>Built for Colosseum Crypto World&apos;s Fair · Devnet MVP</span>
        <span>Permission before payment.</span>
      </footer>
    </main>
  );
}
