import Image from "next/image";

const features = [
  { label: "Budget control", title: "Spending stays within bounds.", text: "Integer base-unit accounting reserves funds atomically before a payment can be signed.", image: "/brand/feature-budgets.svg" },
  { label: "Delegation", title: "Authority only gets narrower.", text: "A child cannot exceed its parent’s available budget, service allowlist, or expiry.", image: "/brand/feature-delegation.svg" },
  { label: "Policy enforcement", title: "Rules checked before payment.", text: "Wrong service, recipient, mint, network, expired authority, and overspend attempts are rejected before broadcast.", image: "/brand/feature-policy.svg" },
] as const;

export function ProductSection() {
  return (
    <section className="landing-section landing-product" id="product">
      <div className="landing-section-heading split">
        <div><span className="eyebrow">The product</span><h2>Task authority,<br /><em>not a shared wallet.</em></h2></div>
        <p>Pactlet is an add-on payment control layer. Agents call one backend purchase service; they never receive the task keypair or raw payment credentials.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map((feature) => (
          <article key={feature.label}>
            <div className="landing-feature-visual"><Image alt="" fill sizes="(max-width: 800px) 100vw, 33vw" src={feature.image} /></div>
            <span className="eyebrow">{feature.label}</span><h3>{feature.title}</h3><p>{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
