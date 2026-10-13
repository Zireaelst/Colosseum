import { describe, expect, test, vi } from "vitest";

import {
  assertFacilitatorSupport,
  readMerchantConfig,
} from "./config";

const payTo = "Cuqk7g7QzJP5yxfsaMAXgFxVQ2h9gDjdBQ3XgfDzJesZ";
const devnet = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

describe("merchant configuration", () => {
  test("uses safe local defaults and accepts a platform port", () => {
    expect(readMerchantConfig({ X402_MERCHANT_PAY_TO: payTo })).toMatchObject({
      payTo,
      facilitatorUrl: "https://x402.org/facilitator",
      host: "127.0.0.1",
      port: 4021,
    });
    expect(
      readMerchantConfig({
        X402_MERCHANT_PAY_TO: payTo,
        X402_MERCHANT_HOST: "0.0.0.0",
        PORT: "8080",
        X402_MERCHANT_PORT: "9999",
      }),
    ).toMatchObject({ host: "0.0.0.0", port: 8080 });
  });

  test("rejects invalid recipients, hosts, ports, and facilitator URLs", () => {
    expect(() => readMerchantConfig({ X402_MERCHANT_PAY_TO: "invalid" })).toThrow(
      "valid Solana address",
    );
    expect(() =>
      readMerchantConfig({
        X402_MERCHANT_PAY_TO: payTo,
        X402_MERCHANT_HOST: "public.example",
      }),
    ).toThrow("bind host");
    expect(() =>
      readMerchantConfig({ X402_MERCHANT_PAY_TO: payTo, PORT: "70000" }),
    ).toThrow("port");
    expect(() =>
      readMerchantConfig({
        X402_MERCHANT_PAY_TO: payTo,
        X402_FACILITATOR_URL: "http://public.example/facilitator",
      }),
    ).toThrow("HTTPS");
  });
});

describe("facilitator support gate", () => {
  test("accepts only a live V2 Solana devnet exact capability", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init).toMatchObject({ redirect: "error" });
      return Response.json({
        kinds: [{ x402Version: 2, scheme: "exact", network: devnet }],
      });
    });

    await expect(
      assertFacilitatorSupport(
        "https://x402.org/facilitator",
        fetchImplementation,
      ),
    ).resolves.toBeUndefined();
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://x402.org/facilitator/supported",
      expect.objectContaining({ redirect: "error" }),
    );
  });

  test.each([
    [{ x402Version: 1, scheme: "exact", network: devnet }],
    [{ x402Version: 2, scheme: "upto", network: devnet }],
    [{ x402Version: 2, scheme: "exact", network: "solana:mainnet" }],
  ])("rejects unsupported facilitator capabilities", async (kind) => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Response.json({ kinds: [kind] }),
    );

    await expect(
      assertFacilitatorSupport(
        "https://x402.org/facilitator",
        fetchImplementation,
      ),
    ).rejects.toThrow("V2 Solana devnet exact");
  });

  test("rejects non-success facilitator responses", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      new Response("unavailable", { status: 503 }),
    );

    await expect(
      assertFacilitatorSupport(
        "https://x402.org/facilitator",
        fetchImplementation,
      ),
    ).rejects.toThrow("returned 503");
  });
});
