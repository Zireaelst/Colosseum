import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PactletApp from "../../app/app/page";
import DemoPage from "../../app/demo/page";
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

  it("keeps the landing-page verification count current", () => {
    expect(renderToStaticMarkup(<Home />)).toContain("140+ tests");
  });
});
