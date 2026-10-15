import Link from "next/link";

export function SecuritySection() {
  return (
    <section className="landing-section landing-security" id="security">
      <div className="landing-section-heading split">
        <div><span className="eyebrow">Honest security boundary</span><h2>Clear about what<br /><em>the chain proves.</em></h2></div>
        <p>This MVP is a custodial prototype. It demonstrates where agent payment authority can be enforced without presenting backend policy as trustless.</p>
      </div>
      <div className="landing-security-grid">
        <article className="onchain"><span className="landing-security-icon">◎</span><div><span className="eyebrow">Solana devnet proves</span><h3>Transfer and signature</h3><ul><li>Token transfer result</li><li>Transaction signature</li><li>Explorer-verifiable settlement</li></ul></div></article>
        <article><span className="landing-security-icon">⌁</span><div><span className="eyebrow">Trusted backend enforces</span><h3>Delegated payment policy</h3><ul><li>Budget and active reservations</li><li>Service allowlist and payment terms</li><li>Expiry, cancellation, and idempotency</li></ul></div></article>
      </div>
      <div className="landing-security-note"><p><strong>Production path:</strong> dedicated key management, a defined custody model, reconciliation workers, and optionally onchain policy or smart accounts.</p><Link href="/docs">Read the trust model <span aria-hidden="true">→</span></Link></div>
    </section>
  );
}
