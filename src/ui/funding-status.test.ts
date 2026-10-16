import { describe, expect, it } from "vitest";
import { checkFundingConfirmation } from "./funding-status";

describe("funding confirmation", () => {
  it("keeps HTTP 202 pending even though response.ok is true", async () => {
    const result = await checkFundingConfirmation("task", "signature", async () => Response.json({ state: "pending" }, { status: 202 }));
    expect(result).toBe("pending");
  });

  it("accepts only an explicit confirmed response for the submitted signature", async () => {
    expect(await checkFundingConfirmation("task", "signature", async () => Response.json({ state: "confirmed", signature: "signature" }))).toBe("confirmed");
    expect(await checkFundingConfirmation("task", "signature", async () => Response.json({ state: "confirmed", signature: "different" }))).toBe("pending");
    expect(await checkFundingConfirmation("task", "signature", async () => Response.json({}))).toBe("pending");
  });

  it("does not treat rejected evidence or RPC errors as safe to fund again", async () => {
    expect(await checkFundingConfirmation("task", "signature", async () => Response.json({ state: "rejected" }, { status: 422 }))).toBe("rejected");
    expect(await checkFundingConfirmation("task", "signature", async () => { throw new Error("timeout"); })).toBe("pending");
  });
});
