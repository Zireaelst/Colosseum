import type { Metadata } from "next";

import { PublicDemo } from "../components/public-demo";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Pactlet Demo — Simulated policy walkthrough",
  description: "Try Pactlet's deterministic delegation and payment-policy walkthrough without signing or broadcasting.",
};

export default function DemoPage() {
  return (
    <div className="product-page-shell demo-page-shell" data-theme="pactlet-vesper">
      <a className="skip-link" href="#demo-content">Skip to demo</a>
      <SiteHeader />
      <main className="app-shell" id="demo-content">
        <header className="app-header">
          <span className="badge"><i /> Guided product demo</span>
          <h1>See the policy flow.<br /><em>No wallet required.</em></h1>
          <p>A deterministic walkthrough of delegation, payment approval, rejection, and cancellation—without signing or broadcasting.</p>
        </header>

        <section className="app-panel">
          <div className="app-panel-heading">
            <div><span className="eyebrow">Guided product demo</span><h2>Permission before payment</h2></div>
            <span className="status-pill warning">SIMULATED</span>
          </div>
          <PublicDemo />
        </section>

        <p className="app-footnote">This route is simulation-only. Use the real app for wallet authentication and devnet evidence.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
