import { describe, expect, test } from "vitest";

import { DEVNET_USDC_MINT } from "../policy/payment-terms";
import { verifyFundingEvidence } from "./funding-evidence";

const expected = {
  signature: "confirmed-devnet-signature",
  sourceOwner: "source-owner",
  sourceAta: "source-usdc-ata",
  destinationAta: "task-usdc-ata",
  mint: DEVNET_USDC_MINT,
  amount: 10_000_000n,
  decimals: 6,
} as const;

function tokenBalance(
  accountIndex: number,
  amount: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    accountIndex,
    mint: DEVNET_USDC_MINT,
    uiTokenAmount: {
      amount,
      decimals: 6,
      uiAmount: Number(amount) / 1_000_000,
      uiAmountString: (Number(amount) / 1_000_000).toString(),
    },
    ...overrides,
  };
}

function validTransaction() {
  return {
    meta: {
      err: null,
      preTokenBalances: [tokenBalance(1, "20000000")],
      postTokenBalances: [
        tokenBalance(1, "10000000"),
        tokenBalance(2, "10000000"),
      ],
    },
    transaction: {
      signatures: [String(expected.signature)],
      message: {
        accountKeys: [
          { pubkey: String(expected.sourceOwner), signer: true, writable: true },
          { pubkey: String(expected.sourceAta), signer: false, writable: true },
          {
            pubkey: String(expected.destinationAta),
            signer: false,
            writable: true,
          },
        ],
      },
    },
  };
}

describe("verifyFundingEvidence", () => {
  test("accepts an exact devnet USDC delta from the wallet ATA to task ATA", () => {
    expect(
      verifyFundingEvidence({ ...expected, transaction: validTransaction() }),
    ).toBe(true);
  });

  test.each([
    ["missing transaction", null],
    [
      "failed transaction",
      (() => {
        const value = validTransaction();
        (value.meta as { err: unknown }).err = {
          InstructionError: [1, "Custom"],
        };
        return value;
      })(),
    ],
    [
      "wrong signature",
      (() => {
        const value = validTransaction();
        value.transaction.signatures[0] = "another-signature";
        return value;
      })(),
    ],
    [
      "wrong payer",
      (() => {
        const value = validTransaction();
        value.transaction.message.accountKeys[0].pubkey = "another-wallet";
        return value;
      })(),
    ],
    [
      "payer did not sign",
      (() => {
        const value = validTransaction();
        value.transaction.message.accountKeys[0].signer = false;
        return value;
      })(),
    ],
    [
      "missing source ATA",
      (() => {
        const value = validTransaction();
        value.transaction.message.accountKeys[1].pubkey = "another-ata";
        return value;
      })(),
    ],
    [
      "missing destination ATA",
      (() => {
        const value = validTransaction();
        value.transaction.message.accountKeys[2].pubkey = "another-ata";
        return value;
      })(),
    ],
    [
      "wrong mint",
      (() => {
        const value = validTransaction();
        value.meta.postTokenBalances[1].mint = "wrong-mint";
        return value;
      })(),
    ],
    [
      "wrong decimals",
      (() => {
        const value = validTransaction();
        value.meta.postTokenBalances[1].uiTokenAmount.decimals = 9;
        return value;
      })(),
    ],
    [
      "wrong source delta",
      (() => {
        const value = validTransaction();
        value.meta.postTokenBalances[0].uiTokenAmount.amount = "11000000";
        return value;
      })(),
    ],
    [
      "wrong destination delta",
      (() => {
        const value = validTransaction();
        value.meta.postTokenBalances[1].uiTokenAmount.amount = "9999999";
        return value;
      })(),
    ],
  ])("rejects %s", (_label, transaction) => {
    expect(verifyFundingEvidence({ ...expected, transaction })).toBe(false);
  });

  test("subtracts an existing destination balance instead of accepting its total", () => {
    const transaction = validTransaction();
    transaction.meta.preTokenBalances.push(tokenBalance(2, "3000000"));
    transaction.meta.postTokenBalances[1].uiTokenAmount.amount = "13000000";

    expect(verifyFundingEvidence({ ...expected, transaction })).toBe(true);
  });
});
