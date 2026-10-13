import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Railway merchant deployment", () => {
  it("typechecks without building the unrelated Next application", () => {
    const config = JSON.parse(readFileSync("railpack.json", "utf8")) as {
      steps?: { build?: { commands?: string[] } };
      deploy?: { startCommand?: string };
    };

    expect(config.steps?.build?.commands).toEqual(["pnpm typecheck"]);
    expect(config.deploy?.startCommand).toBe("pnpm merchant");
  });
});
