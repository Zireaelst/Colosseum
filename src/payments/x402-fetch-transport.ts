import { decodePaymentRequiredHeader } from "@x402/core/http";
import { validatePaymentRequired } from "@x402/core/schemas";
import type { PaymentRequirements, SettleResponse } from "@x402/core/types";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";

import { createSolanaRpc, signature } from "@solana/kit";

import { SOLANA_DEVNET_NETWORK } from "../policy/payment-terms";
import type { PaymentTransport } from "./purchase-service";

function sameTerms(
  candidate: PaymentRequirements,
  expected: PaymentRequirements,
): boolean {
  return (
    candidate.scheme === expected.scheme &&
    candidate.network === expected.network &&
    candidate.asset === expected.asset &&
    candidate.amount === expected.amount &&
    candidate.payTo === expected.payTo
  );
}

export class X402FetchTransport implements PaymentTransport {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async getChallenge(url: string): Promise<unknown> {
    const response = await this.fetchImplementation(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== 402) {
      throw new Error(`x402 merchant expected 402, received ${response.status}`);
    }
    const header = response.headers.get("PAYMENT-REQUIRED");
    if (!header) throw new Error("x402 merchant omitted PAYMENT-REQUIRED");
    return validatePaymentRequired(decodePaymentRequiredHeader(header));
  }

  async pay({
    url,
    requirement,
    signer,
    onSigned,
  }: Parameters<PaymentTransport["pay"]>[0]): Promise<SettleResponse> {
    let settlement: SettleResponse | undefined;
    const client = new x402Client((_version, requirements) => {
      const selected = requirements.find((candidate) =>
        sameTerms(candidate, requirement),
      );
      if (!selected) throw new Error("Merchant changed payment terms");
      return selected;
    })
      .register(SOLANA_DEVNET_NETWORK, new ExactSvmScheme(signer))
      .registerPolicy((version, requirements) =>
        version === 2
          ? requirements.filter((candidate) => sameTerms(candidate, requirement))
          : [],
      )
      .onAfterPaymentCreation(async () => {
        onSigned();
      })
      .onPaymentResponse(async (context) => {
        settlement = context.settleResponse;
      });

    const paidFetch = wrapFetchWithPayment(this.fetchImplementation, client);
    await paidFetch(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!settlement) {
      throw new Error("Paid response omitted a valid x402 settlement result");
    }
    return settlement;
  }

  async verifySettlement(settlement: SettleResponse): Promise<boolean> {
    if (
      !settlement.success ||
      settlement.network !== SOLANA_DEVNET_NETWORK ||
      !settlement.transaction
    ) {
      return false;
    }
    const rpc = createSolanaRpc(
      process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
    );
    const statuses = await rpc
      .getSignatureStatuses([signature(settlement.transaction)], {
        searchTransactionHistory: true,
      })
      .send();
    const status = statuses.value[0];
    return Boolean(
      status &&
        !status.err &&
        ["confirmed", "finalized"].includes(status.confirmationStatus ?? ""),
    );
  }
}
