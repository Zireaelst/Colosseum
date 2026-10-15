import Image from "next/image";

const steps = [
  ["01", "Connect", "Prove ownership with a wallet nonce signature."],
  ["02", "Scope", "Create a disposable devnet task account and authority."],
  ["03", "Delegate", "Give specialist agents smaller budgets and service lists."],
  ["04", "Check & pay", "Validate the x402 terms, reserve budget, then sign."],
  ["05", "Verify", "Reconcile settlement and expose the devnet signature."],
] as const;

export function HowItWorksSection() {
  return (
    <section className="landing-section landing-workflow" id="how-it-works">
      <div className="landing-workflow-copy">
        <span className="eyebrow">How it works</span><h2>One owner approval.<br />Bounded execution after.</h2>
        <p>The owner funds a task. Server runtime identity decides which delegated authority an agent can use—never model-authored text.</p>
        <ol>{steps.map(([number, title, text]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol>
      </div>
      <div className="landing-workflow-visual">
        <Image alt="Diagram showing a task owner delegating narrower budgets to research and analysis agents" height={900} sizes="(max-width: 900px) 100vw, 48vw" src="/brand/delegation-illustration.svg" width={1400} />
        <div className="landing-boundary-chip"><i /> Checked before signing</div>
      </div>
    </section>
  );
}
