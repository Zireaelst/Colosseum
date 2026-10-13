import { encodePaymentRequiredHeader } from "@x402/core/http";
import type { PaymentRequired } from "@x402/core/types";
import { describe, expect, test, vi } from "vitest";

import {
  DEVNET_USDC_MINT,
  SOLANA_DEVNET_NETWORK,
} from "../policy/payment-terms";
import { X402FetchTransport } from "./x402-fetch-transport";

const paymentRequired: PaymentRequired = {
  x402Version: 2,
  resource: { url: "http://127.0.0.1:4021/research" },
  accepts: [
    {
      scheme: "exact",
      network: SOLANA_DEVNET_NETWORK,
      asset: DEVNET_USDC_MINT,
      amount: "1000",
      payTo: "merchant",
      maxTimeoutSeconds: 60,
      extra: {},
    },
  ],
};

describe("X402FetchTransport.getChallenge", () => {
  test("uses the official header codec and disables redirects", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired),
        },
      }),
    );
    const transport = new X402FetchTransport(fetchImplementation);

    await expect(
      transport.getChallenge("http://127.0.0.1:4021/research"),
    ).resolves.toMatchObject({ x402Version: 2, accepts: [{ amount: "1000" }] });
    expect(fetchImplementation).toHaveBeenCalledWith(
      "http://127.0.0.1:4021/research",
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );
  });

  test("rejects a non-402 response before any signing path", async () => {
    const transport = new X402FetchTransport(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 })),
    );

    await expect(transport.getChallenge(paymentRequired.resource.url)).rejects.toThrow(
      "expected 402",
    );
  });
});
