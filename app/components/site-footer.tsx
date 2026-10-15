import Link from "next/link";

import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-main">
        <div>
          <BrandMark />
          <p>Task-scoped authority for AI agent payments.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/#product">Product</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#security">Security</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/app">App</Link>
        </nav>
      </div>
      <div className="public-footer-meta">
        <span>Devnet-only custodial prototype</span>
        <span>Policy is enforced by a trusted backend</span>
      </div>
    </footer>
  );
}
