import { describe, expect, it } from "vitest";

import { getAppProgress } from "../../app/components/app-progress";

describe("live app progress", () => {
  it.each([
    [{ walletVerified: false, taskCreated: false, fundingState: "idle" }, 1],
    [{ walletVerified: true, taskCreated: false, fundingState: "idle" }, 2],
    [{ walletVerified: true, taskCreated: true, fundingState: "idle" }, 2],
    [{ walletVerified: true, taskCreated: true, fundingState: "confirmed" }, 3],
  ] as const)("derives the active step", (state, expected) => {
    expect(getAppProgress(state).activeStep).toBe(expected);
  });
});
