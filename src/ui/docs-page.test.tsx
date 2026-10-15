import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocsPage from "../../app/docs/page";

describe("docs page", () => {
  it("documents quick start without overstating enforcement", () => {
    const html = renderToStaticMarkup(<DocsPage />);

    expect(html).toContain("Quick start");
    expect(html).toContain("Solana devnet only");
    expect(html).toContain("backend-enforced");
    expect(html).toContain("Simulated demo");
    expect(html).toContain("NEXT_PUBLIC_APP_ORIGIN");
    expect(html).not.toContain("production secure");
  });
});
