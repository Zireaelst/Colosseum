import { describe, expect, it } from "vitest";

import { createPublicDemoState, reducePublicDemo } from "./public-demo";

describe("public demo state", () => {
  it("starts with the fixed 10/4/3 authority hierarchy", () => {
    const state = createPublicDemoState();

    expect(
      state.delegations.map(({ allocation, available, status }) => [
        allocation,
        available,
        status,
      ]),
    ).toEqual([
      [10_000_000n, 3_000_000n, "active"],
      [4_000_000n, 4_000_000n, "active"],
      [3_000_000n, 3_000_000n, "active"],
    ]);
  });

  it("settles the allowed research purchase as an explicit simulation", () => {
    const state = reducePublicDemo(createPublicDemoState(), {
      type: "allow_purchase",
    });

    expect(state.delegations[1]?.available).toBe(3_999_000n);
    expect(state.payments.at(-1)).toMatchObject({
      amount: 1_000n,
      rejectionCode: null,
      simulated: true,
      state: "settled",
    });
  });

  it("records an over-budget rejection without consuming budget", () => {
    const paid = reducePublicDemo(createPublicDemoState(), {
      type: "allow_purchase",
    });
    const state = reducePublicDemo(paid, { type: "reject_over_budget" });

    expect(state.delegations[1]?.available).toBe(3_999_000n);
    expect(state.payments.at(-1)).toMatchObject({
      rejectionCode: "BUDGET_EXCEEDED",
      simulated: true,
      state: "rejected",
    });
  });

  it("returns unused authority on cancellation but preserves settled spend", () => {
    const paid = reducePublicDemo(createPublicDemoState(), {
      type: "allow_purchase",
    });
    const state = reducePublicDemo(paid, { type: "cancel_research" });

    expect(state.delegations[0]?.available).toBe(6_999_000n);
    expect(state.delegations[1]?.status).toBe("cancelled");
  });

  it("rejects a post-cancellation request without consuming budget", () => {
    const cancelled = reducePublicDemo(createPublicDemoState(), {
      type: "cancel_research",
    });
    const state = reducePublicDemo(cancelled, { type: "reject_after_cancel" });

    expect(state.delegations[1]?.available).toBe(4_000_000n);
    expect(state.payments.at(-1)).toMatchObject({
      rejectionCode: "AUTHORITY_CANCELLED",
      simulated: true,
      state: "rejected",
    });
  });

  it("resets to a fresh deterministic walkthrough", () => {
    const changed = reducePublicDemo(createPublicDemoState(), {
      type: "allow_purchase",
    });

    expect(reducePublicDemo(changed, { type: "reset" })).toEqual(
      createPublicDemoState(),
    );
  });
});
