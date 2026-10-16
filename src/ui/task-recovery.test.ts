import { describe, expect, it } from "vitest";
import { recoverFundingState } from "./task-recovery";

describe("task funding recovery", () => {
  it("trusts the authenticated server record for confirmed funding", () => {
    expect(recoverFundingState({ fundingSignature: "confirmed" }, "submitted")).toEqual({ state: "confirmed", signature: "confirmed" });
  });
  it("keeps browser-recorded submissions pending until server verification", () => {
    expect(recoverFundingState({}, "submitted")).toEqual({ state: "confirming", signature: "submitted" });
  });
  it("does not infer funding from a task account's existence", () => {
    expect(recoverFundingState({}, null)).toEqual({ state: "idle", signature: null });
  });
});
