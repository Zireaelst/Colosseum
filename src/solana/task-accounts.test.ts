import { describe, expect, test } from "vitest";

import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../policy/payment-terms";
import { TaskAccountStore } from "./task-accounts";

describe("TaskAccountStore", () => {
  test("creates distinct disposable devnet accounts without exposing key material", async () => {
    const store = new TaskAccountStore();
    const first = await store.create("wallet-owner");
    const second = await store.create("wallet-owner");

    expect(first).toMatchObject({
      ownerWallet: "wallet-owner",
      network: SOLANA_DEVNET_NETWORK,
      mint: DEVNET_USDC_MINT,
      allocation: "10000000",
    });
    expect(first.paymentAddress).not.toBe(second.paymentAddress);
    expect(first.paymentAta).not.toBe(second.paymentAta);
    expect(first).not.toHaveProperty("keyPair");
    expect(first).not.toHaveProperty("secretKey");
    expect(store.signer(first.id).address).toBe(first.paymentAddress);
  });
});
