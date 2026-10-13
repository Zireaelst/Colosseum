import type { KeyPairSigner } from "@solana/kit";
import { validatePaymentRequired } from "@x402/core/schemas";
import type {
  PaymentRequired,
  PaymentRequirements,
  SettleResponse,
} from "@x402/core/types";

import type { Ledger, ReservePurchaseResult } from "../ledger/ledger";
import {
  SOLANA_DEVNET_NETWORK,
  validatePaymentTerms,
} from "../policy/payment-terms";

export interface MerchantService {
  serviceId: string;
  url: string;
  payTo: string;
}

export interface PaymentTransport {
  getChallenge(url: string): Promise<unknown>;
  pay(input: {
    url: string;
    requirement: PaymentRequirements;
    signer: KeyPairSigner;
    onSigned(): void;
  }): Promise<SettleResponse>;
  verifySettlement(settlement: SettleResponse): Promise<boolean>;
}

export interface PurchaseInput {
  taskId: string;
  delegationId: string;
  purchaseKey: string;
  serviceId: string;
  now?: number;
}

export type PurchaseResult =
  | {
      ok: true;
      paymentRequestId: string;
      replayed: boolean;
      state: "reserved" | "settlement_pending" | "settled";
      amount: bigint;
      transactionSignature: string | null;
    }
  | {
      ok: false;
      code: string;
      state: "rejected" | "failed" | "settlement_pending";
      paymentRequestId?: string;
    };

export class PurchaseService {
  constructor(
    private readonly dependencies: {
      ledger: Ledger;
      merchant: MerchantService;
      transport: PaymentTransport;
      signerForTask(taskId: string): KeyPairSigner | Promise<KeyPairSigner>;
    },
  ) {}

  async purchase(input: PurchaseInput): Promise<PurchaseResult> {
    const now = input.now ?? Date.now();
    const { ledger, merchant, transport } = this.dependencies;

    if (input.serviceId !== merchant.serviceId) {
      return {
        ok: false,
        code: "SERVICE_NOT_CONFIGURED",
        state: "rejected",
      };
    }

    let paymentRequired: PaymentRequired;
    try {
      const parsed = validatePaymentRequired(
        await transport.getChallenge(merchant.url),
      );
      if (parsed.x402Version !== 2) throw new Error("x402 V2 required");
      paymentRequired = {
        ...parsed,
        extensions: parsed.extensions ?? undefined,
        accepts: parsed.accepts.map((requirement) => ({
          ...requirement,
          network: requirement.network as PaymentRequirements["network"],
          extra: requirement.extra ?? {},
        })),
      };
    } catch {
      return {
        ok: false,
        code: "INVALID_PAYMENT_REQUIRED",
        state: "rejected",
      };
    }

    if (
      paymentRequired.x402Version !== 2 ||
      paymentRequired.resource.url !== merchant.url
    ) {
      return {
        ok: false,
        code: "RESOURCE_MISMATCH",
        state: "rejected",
      };
    }

    const available = ledger.availableAmount(input.delegationId, now);
    let selected: PaymentRequirements | undefined;
    let rejectionCode = "UNSUPPORTED_PAYMENT_TERMS";
    for (const requirement of paymentRequired.accepts) {
      const decision = validatePaymentTerms(
        { x402Version: 2, ...requirement },
        {
          serviceId: input.serviceId,
          merchantServiceId: merchant.serviceId,
          allowedServices: [merchant.serviceId],
          expectedPayTo: merchant.payTo,
          maxAmount: available,
        },
      );
      if (decision.ok) {
        selected = requirement;
        break;
      }
      rejectionCode = decision.code;
    }

    if (!selected) {
      return { ok: false, code: rejectionCode, state: "rejected" };
    }

    const reservation = ledger.reservePurchase({
      delegationId: input.delegationId,
      purchaseKey: input.purchaseKey,
      serviceId: input.serviceId,
      amount: BigInt(selected.amount),
      now,
    });

    if (!reservation.ok) return this.rejectedReservation(reservation);
    if (reservation.replayed) {
      const stored = ledger.paymentRequest(reservation.paymentRequestId);
      if (
        stored.state === "settlement_pending" &&
        stored.transactionSignature &&
        (await transport.verifySettlement({
          success: true,
          transaction: stored.transactionSignature,
          network: SOLANA_DEVNET_NETWORK,
        }))
      ) {
        ledger.confirmSettlement(stored.id, stored.transactionSignature, now);
        return {
          ok: true,
          paymentRequestId: stored.id,
          replayed: true,
          state: "settled",
          amount: stored.amount,
          transactionSignature: stored.transactionSignature,
        };
      }
      return {
        ok: true,
        paymentRequestId: stored.id,
        replayed: true,
        state: stored.state as "reserved" | "settlement_pending" | "settled",
        amount: stored.amount,
        transactionSignature: stored.transactionSignature,
      };
    }

    let signed = false;
    const onSigned = () => {
      if (signed) return;
      signed = true;
      ledger.markSettlementPending(reservation.paymentRequestId, Date.now());
    };

    try {
      const settlement = await transport.pay({
        url: merchant.url,
        requirement: selected,
        signer: await this.dependencies.signerForTask(input.taskId),
        onSigned,
      });

      if (!settlement.success) {
        ledger.failPayment(
          reservation.paymentRequestId,
          settlement.errorReason ?? "x402_settlement_failed",
          Date.now(),
        );
        return {
          ok: false,
          code: settlement.errorReason ?? "SETTLEMENT_FAILED",
          state: "failed",
          paymentRequestId: reservation.paymentRequestId,
        };
      }

      if (!signed) onSigned();
      if (settlement.transaction) {
        ledger.recordPendingSignature(
          reservation.paymentRequestId,
          settlement.transaction,
          Date.now(),
        );
      }
      if (
        !settlement.transaction ||
        !(await transport.verifySettlement(settlement))
      ) {
        return {
          ok: false,
          code: "SETTLEMENT_UNCONFIRMED",
          state: "settlement_pending",
          paymentRequestId: reservation.paymentRequestId,
        };
      }
      ledger.confirmSettlement(
        reservation.paymentRequestId,
        settlement.transaction,
        Date.now(),
      );
      return {
        ok: true,
        paymentRequestId: reservation.paymentRequestId,
        replayed: false,
        state: "settled",
        amount: reservation.amount,
        transactionSignature: settlement.transaction,
      };
    } catch {
      if (signed) {
        return {
          ok: false,
          code: "SETTLEMENT_UNCERTAIN",
          state: "settlement_pending",
          paymentRequestId: reservation.paymentRequestId,
        };
      }
      ledger.failPayment(
        reservation.paymentRequestId,
        "pre_signature_failure",
        Date.now(),
      );
      return {
        ok: false,
        code: "PAYMENT_NOT_SIGNED",
        state: "failed",
        paymentRequestId: reservation.paymentRequestId,
      };
    }
  }

  private rejectedReservation(
    reservation: Extract<ReservePurchaseResult, { ok: false }>,
  ): PurchaseResult {
    return {
      ok: false,
      code: reservation.code,
      state: reservation.state,
      paymentRequestId: reservation.paymentRequestId,
    };
  }
}
