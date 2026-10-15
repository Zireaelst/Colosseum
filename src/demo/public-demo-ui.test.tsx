import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PactletApp from "../../app/app/page";
import DemoPage from "../../app/demo/page";
import DocsPage from "../../app/docs/page";
import AppError from "../../app/app/error";
import Home from "../../app/page";

describe("public demo interface", () => {
  it("keeps the product route live-only", () => {
    const html = renderToStaticMarkup(<PactletApp />);

    expect(html).toContain("Connect your Solana wallet");
    expect(html).toContain("Devnet only");
    expect(html).not.toContain("SIMULATED");
    expect(html).not.toContain("Public Demo");
  });

  it("keeps the guided demo route simulation-only", () => {
    const html = renderToStaticMarkup(<DemoPage />);

    expect(html).toContain("Guided product demo");
    expect(html).toContain("SIMULATED");
    expect(html).not.toContain("Connect your Solana wallet");
    expect(html).not.toContain("explorer.solana.com/tx/");
  });

  it("renders a complete product story with working anchors", () => {
    const html = renderToStaticMarkup(<Home />);

    for (const id of ["product", "how-it-works", "security"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('href="/app"');
    expect(html).toContain('href="/demo"');
    expect(html).toContain('href="/docs"');
    expect(html).toContain("trusted backend");
    expect(html).not.toContain("140+ tests");
  });

  it("renders the Pactlet cinematic hero with an honest video fallback", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("<video");
    expect(html).toContain("hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4");
    expect(html).toContain('poster="/brand/hero-background.svg"');
    expect(html).toContain('preload="metadata"');
    expect(html).toContain("Pre-signature policy");
    expect(html).toContain("Solana devnet receipts");
    expect(html).not.toContain("Vesper");
  });

  it("offers safe recovery when the live application fails", () => {
    const html = renderToStaticMarkup(
      <AppError error={new Error("secret backend detail")} reset={() => undefined} />,
    );

    expect(html).toContain("Try again");
    expect(html).toContain("Open guided demo");
    expect(html).not.toContain("secret backend detail");
  });

  it("gives every public page a skip link and one primary heading", () => {
    for (const page of [<Home />, <DocsPage />, <PactletApp />, <DemoPage />]) {
      const html = renderToStaticMarkup(page);
      expect(html).toContain("skip-link");
      expect(html.match(/<h1/g)).toHaveLength(1);
    }
  });

  it("announces live application state changes", () => {
    expect(renderToStaticMarkup(<PactletApp />)).toContain('aria-live="polite"');
  });
});
