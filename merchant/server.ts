import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";

import { SOLANA_DEVNET_NETWORK } from "../src/policy/payment-terms";

const payTo = process.env.X402_MERCHANT_PAY_TO;
if (!payTo) throw new Error("X402_MERCHANT_PAY_TO is required");

const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
const port = Number(process.env.X402_MERCHANT_PORT ?? "4021");
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitator).register(
  SOLANA_DEVNET_NETWORK,
  new ExactSvmScheme(),
);

const app = express();
app.use(
  paymentMiddleware(
    {
      "GET /research": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: SOLANA_DEVNET_NETWORK,
          payTo,
          maxTimeoutSeconds: 60,
        },
        description: "pactlet paid research brief",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);
app.get("/research", (_request, response) => {
  response.json({
    source: "pactlet-demo-merchant",
    finding: "The paid research service was reached after x402 settlement.",
  });
});
app.get("/health", (_request, response) => response.json({ ok: true }));

app.listen(port, "127.0.0.1", () => {
  console.log(`pactlet merchant listening on http://127.0.0.1:${port}`);
});
