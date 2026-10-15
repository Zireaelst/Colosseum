import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment bundle", () => {
  it("only ignores the root documentation folder so the /docs route is deployed", () => {
    const rules = readFileSync(".vercelignore", "utf8").split(/\r?\n/);

    expect(rules).not.toContain("docs/");
    expect(rules).toContain("/docs/");
  });
});
