import { describe, expect, it } from "vitest";

import { readRuntimeReadiness } from "./readiness";

describe("runtime readiness", () => {
  it("reports booleans without exposing configuration values", () => {
    expect(readRuntimeReadiness({
      AI_API_KEY: "secret",
      TYPESAFE_API_KEY: "",
      X402_MERCHANT_PAY_TO: "recipient",
      SOLANA_DEVNET_RPC_URL: "rpc",
    })).toEqual({ ai: true, jev: false, merchant: true, rpc: true });
  });
});
