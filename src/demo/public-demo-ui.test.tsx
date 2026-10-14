import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DemoModes } from "../../app/components/public-demo";
import Home from "../../app/page";

describe("public demo interface", () => {
  it("defaults to a clearly labeled simulation and exposes live devnet separately", () => {
    const html = renderToStaticMarkup(<DemoModes />);

    expect(html).toContain("Public Demo");
    expect(html).toContain("SIMULATED");
    expect(html).toContain("Live Devnet");
    expect(html).toContain("hosted Supabase state");
    expect(html).toContain("public x402 merchant");
    expect(html).not.toContain("single-process");
    expect(html).not.toContain("explorer.solana.com/tx/");
  });

  it("keeps the landing-page verification count current", () => {
    expect(renderToStaticMarkup(<Home />)).toContain("140+ tests");
  });
});
