import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";

import { SOLANA_DEVNET_NETWORK } from "../src/policy/payment-terms";
import { assertFacilitatorSupport, readMerchantConfig } from "./config";

const config = readMerchantConfig();
await assertFacilitatorSupport(config.facilitatorUrl);
const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
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
          payTo: config.payTo,
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
app.get("/health", (_request, response) =>
  response.json({
    ok: true,
    network: SOLANA_DEVNET_NETWORK,
    scheme: "exact",
    x402Version: 2,
  }),
);

app.listen(config.port, config.host, () => {
  console.log(`pactlet merchant listening on ${config.host}:${config.port}`);
});
