import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "../../app/components/site-header";
import { LANDING_SECTION_IDS, PUBLIC_NAV_ITEMS } from "./public-navigation";

describe("public navigation", () => {
  it("targets a real landing section or public route", () => {
    for (const item of PUBLIC_NAV_ITEMS) {
      if (item.href.startsWith("/#")) {
        expect(LANDING_SECTION_IDS).toContain(item.href.slice(2));
      } else {
        expect(["/docs", "/demo", "/app"]).toContain(item.href);
      }
    }
  });

  it("renders Pactlet's shared metallic navigation contract", () => {
    const html = renderToStaticMarkup(createElement(SiteHeader));

    expect(html).toContain("Pactlet");
    expect(html).toContain("public-nav-link");
    expect(html).toContain("public-header-cta");
    expect(html).not.toContain("Vesper");
  });
});
