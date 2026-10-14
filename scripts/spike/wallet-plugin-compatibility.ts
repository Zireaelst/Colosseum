import { walletClient } from "@pactlet/wallet-kit";

import { buildTaskFundingTransaction } from "../../src/solana/funding-transaction";
import { X402FetchTransport } from "../../src/payments/x402-fetch-transport";

if (!walletClient || !buildTaskFundingTransaction || !X402FetchTransport) {
  throw new Error("Wallet, funding, and x402 modules did not load together");
}

console.log("PASS wallet plugin + funding + x402 modules load together on devnet");
