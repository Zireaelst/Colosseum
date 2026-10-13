import { describe, expect, test } from "vitest";

import {
  DEVNET_USDC_MINT,
  SOLANA_DEVNET_NETWORK,
  validatePaymentTerms,
} from "./payment-terms";

const allowedPayTo = "seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX";

function paymentRequirement(
  overrides: Partial<{
    x402Version: number;
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    amount: string;
  }> = {},
) {
  return {
    x402Version: 2,
    scheme: "exact",
    network: SOLANA_DEVNET_NETWORK,
    asset: DEVNET_USDC_MINT,
    payTo: allowedPayTo,
    amount: "250000",
    ...overrides,
  };
}

describe("validatePaymentTerms", () => {
  test("rejects payment requirements from an unsupported x402 version", () => {
    const decision = validatePaymentTerms(paymentRequirement({ x402Version: 1 }), {
      serviceId: "research-api",
      merchantServiceId: "research-api",
      allowedServices: ["research-api"],
      expectedPayTo: allowedPayTo,
      maxAmount: 1_000_000n,
    });

    expect(decision).toMatchObject({ ok: false, code: "WRONG_VERSION" });
  });

  test("rejects a payment scheme other than exact", () => {
    const decision = validatePaymentTerms(paymentRequirement({ scheme: "upto" }), {
      serviceId: "research-api",
      merchantServiceId: "research-api",
      allowedServices: ["research-api"],
      expectedPayTo: allowedPayTo,
      maxAmount: 1_000_000n,
    });

    expect(decision).toMatchObject({ ok: false, code: "WRONG_SCHEME" });
  });

  test("rejects a network other than Solana devnet", () => {
    const decision = validatePaymentTerms(
      paymentRequirement({ network: "solana:mainnet" }),
      {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      },
    );

    expect(decision).toMatchObject({ ok: false, code: "WRONG_NETWORK" });
  });

  test("rejects a token mint other than the pinned devnet USDC mint", () => {
    const decision = validatePaymentTerms(
      paymentRequirement({ asset: "11111111111111111111111111111111" }),
      {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      },
    );

    expect(decision).toMatchObject({ ok: false, code: "WRONG_MINT" });
  });

  test("rejects a service outside the authenticated delegation allowlist", () => {
    const decision = validatePaymentTerms(paymentRequirement(), {
      serviceId: "analysis-api",
      merchantServiceId: "analysis-api",
      allowedServices: ["research-api"],
      expectedPayTo: allowedPayTo,
      maxAmount: 1_000_000n,
    });

    expect(decision).toMatchObject({
      ok: false,
      code: "SERVICE_NOT_ALLOWED",
    });
  });

  test("rejects a service that does not match the configured merchant route", () => {
    const decision = validatePaymentTerms(paymentRequirement(), {
      serviceId: "research-api",
      merchantServiceId: "analysis-api",
      allowedServices: ["research-api", "analysis-api"],
      expectedPayTo: allowedPayTo,
      maxAmount: 1_000_000n,
    });

    expect(decision).toMatchObject({ ok: false, code: "SERVICE_MISMATCH" });
  });

  test.each(["", "0", "-1", "1.5", "01", " 1", "1e3"])(
    "rejects malformed or non-positive base-unit amount %j",
    (amount) => {
      const decision = validatePaymentTerms(paymentRequirement({ amount }), {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      });

      expect(decision).toMatchObject({ ok: false, code: "INVALID_AMOUNT" });
    },
  );

  test("rejects an amount above the delegation's current budget", () => {
    const decision = validatePaymentTerms(
      paymentRequirement({ amount: "1000001" }),
      {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      },
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "AMOUNT_EXCEEDS_BUDGET",
    });
  });

  test("rejects a payment recipient other than the configured merchant", () => {
    const decision = validatePaymentTerms(
      paymentRequirement({
        payTo: "11111111111111111111111111111111",
      }),
      {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      },
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "WRONG_RECIPIENT",
    });
  });

  test("returns the parsed base-unit amount for an allowed exact payment", () => {
    expect(
      validatePaymentTerms(paymentRequirement(), {
        serviceId: "research-api",
        merchantServiceId: "research-api",
        allowedServices: ["research-api"],
        expectedPayTo: allowedPayTo,
        maxAmount: 1_000_000n,
      }),
    ).toEqual({ ok: true, amount: 250_000n });
  });
});
