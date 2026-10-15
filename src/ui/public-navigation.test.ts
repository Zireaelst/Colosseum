import { describe, expect, it } from "vitest";

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
});
