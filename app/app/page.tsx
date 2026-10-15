import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "../components/brand-mark";
import { WalletConnect } from "../wallet-connect";

export const metadata: Metadata = {
  title: "Pactlet App — Live Solana devnet flow",
  description: "Create and fund a task-scoped authority for a bounded AI agent payment on Solana devnet.",
};

export default function PactletApp() {
  return (
    <div className="product-page-shell workspace" data-theme="pactlet-vesper">
      <a className="skip-link" href="#app-content">Skip to application</a>
      <aside className="workspace-sidebar">
        <BrandMark />
        <div className="workspace-switcher"><span className="workspace-avatar" aria-hidden="true">P</span><div>Personal workspace<small>Solana devnet</small></div></div>
        <span className="workspace-nav-label">Workspace</span>
        <nav aria-label="Workspace navigation">
          <Link href="/app" aria-current="page"><span aria-hidden="true">▦</span> Tasks <span className="workspace-nav-badge">Devnet</span></Link>
          <Link href="/demo"><span aria-hidden="true">▷</span> Guided walkthrough</Link>
          <Link href="/docs"><span aria-hidden="true">≡</span> Documentation</Link>
        </nav>
        <div className="workspace-sidebar-bottom"><span className="workspace-network"><i /> Devnet only</span><p>Your wallet approves funding. Agents work within the task’s permissions.</p><Link href="/">← Back to website</Link></div>
      </aside>
      <main className="workspace-main" id="app-content">
        <div className="workspace-topbar"><span>Workspace <span aria-hidden="true">/</span> Tasks</span><Link href="/docs#quick-start">Quick start ↗</Link></div>
        <div className="workspace-content">
        <header className="workspace-heading">
          <div><span className="workspace-overline">Your agent workspace</span><h1>Tasks</h1><p>Give your agents a clear brief and a budget you control.</p></div>
          <Link className="workspace-help-link" href="/demo">Explore a sample task <span aria-hidden="true">↗</span></Link>
        </header>
        <div className="workspace-intro">
          <div className="workspace-intro-copy"><span className="workspace-intro-icon" aria-hidden="true">↳</span><div><h2>Create your first task</h2><p>Connect your Solana wallet, define the work, then review the funding details before you approve.</p></div></div>
          <dl className="workspace-defaults"><div><dt>Task budget</dt><dd>10 <span>test USDC</span></dd></div><div><dt>Specialists</dt><dd>2 <span>agents</span></dd></div><div><dt>Permission window</dt><dd>45 <span>minutes</span></dd></div></dl>
        </div>
        <section className="app-panel workspace-task-panel" aria-labelledby="task-setup-heading">
          <div className="app-panel-heading">
            <div><h2 id="task-setup-heading">Task setup</h2><p>Connect, set permissions, and start working.</p></div>
            <span className="workspace-network"><i /> Solana devnet</span>
          </div>
          <WalletConnect />
        </section>
        <div className="workspace-trust"><span aria-hidden="true">◇</span><p>Policy is backend-enforced. This custodial devnet prototype uses test tokens; Solana records confirmed transfers.</p><Link href="/docs#trust">How it works ↗</Link></div>
        </div>
      </main>
    </div>
  );
}
