import { describe, expect, test } from "vitest";

import { parseTaskMandate } from "./task-mandate";

describe("parseTaskMandate", () => {
  test("accepts the fixed MVP resource and converts integer base units", () => {
    expect(
      parseTaskMandate({
        purpose: "  Compare paid research for my task  ",
        serviceId: "research-api",
        resourceId: "research-brief",
        maxAmountBaseUnits: "1000",
        durationMinutes: 45,
      }),
    ).toEqual({
      purpose: "Compare paid research for my task",
      serviceId: "research-api",
      resourceId: "research-brief",
      maxAmount: 1_000n,
      durationMinutes: 45,
    });
  });

  test.each([
    ["unconfigured service", { serviceId: "cloud-api" }],
    ["unconfigured resource", { resourceId: "cloud-credit" }],
    ["fractional amount", { maxAmountBaseUnits: "1.5" }],
    ["zero amount", { maxAmountBaseUnits: "0" }],
    ["excessive task duration", { durationMinutes: 61 }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      parseTaskMandate({
        purpose: "Buy a bounded research brief",
        serviceId: "research-api",
        resourceId: "research-brief",
        maxAmountBaseUnits: "1000",
        durationMinutes: 45,
        ...override,
      }),
    ).toThrow();
  });
});
