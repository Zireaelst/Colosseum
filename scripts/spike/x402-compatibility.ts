import express from "express";
import { generateKeyPairSigner } from "@solana/kit";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { x402Client } from "@x402/fetch";
import { ExactSvmScheme as ExactSvmClientScheme } from "@x402/svm/exact/client";
import { ExactSvmScheme as ExactSvmServerScheme } from "@x402/svm/exact/server";

const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const supportedResponse = await fetch(`${facilitatorUrl}/supported`, {
  redirect: "error",
  signal: AbortSignal.timeout(15_000),
});

if (!supportedResponse.ok) {
  throw new Error(`Facilitator /supported returned ${supportedResponse.status}`);
}

const supported = (await supportedResponse.json()) as {
  kinds?: Array<{ network?: string; scheme?: string; x402Version?: number }>;
};
const supportsRequiredKind = supported.kinds?.some(
  (kind) =>
    kind.x402Version === 2 &&
    kind.scheme === "exact" &&
    kind.network === DEVNET,
);

if (!supportsRequiredKind) {
  throw new Error("Facilitator does not advertise x402 V2 Solana devnet exact");
}

const signer = await generateKeyPairSigner();
const buyer = new x402Client().register(
  "solana:*",
  new ExactSvmClientScheme(signer),
);
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitator).register(
  DEVNET,
  new ExactSvmServerScheme(),
);
const merchant = express().use(
  paymentMiddleware(
    {
      "GET /research": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: DEVNET,
          payTo: signer.address,
        },
        description: "pactlet compatibility spike",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

if (!buyer || !merchant) {
  throw new Error("x402 buyer or merchant construction failed");
}

console.log(
  "PASS x402 2.28.0 + Solana Kit 5.5.1: V2 devnet exact advertised and client/server constructed",
);
