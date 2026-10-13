export const SOLANA_DEVNET_NETWORK =
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const DEVNET_USDC_MINT =
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export interface X402PaymentRequirement {
  x402Version: number;
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  amount: string;
}

export interface PaymentPolicyContext {
  serviceId: string;
  merchantServiceId: string;
  allowedServices: readonly string[];
  expectedPayTo: string;
  maxAmount: bigint;
}

export type PaymentTermsDecision =
  | { ok: true; amount: bigint }
  | {
      ok: false;
      code:
        | "WRONG_VERSION"
        | "WRONG_SCHEME"
        | "WRONG_NETWORK"
        | "WRONG_MINT"
        | "WRONG_RECIPIENT"
        | "SERVICE_NOT_ALLOWED"
        | "SERVICE_MISMATCH"
        | "INVALID_AMOUNT"
        | "AMOUNT_EXCEEDS_BUDGET";
      message: string;
    };

export function validatePaymentTerms(
  requirement: X402PaymentRequirement,
  context: PaymentPolicyContext,
): PaymentTermsDecision {
  if (requirement.x402Version !== 2) {
    return {
      ok: false,
      code: "WRONG_VERSION",
      message: "Only x402 version 2 payment requirements are accepted",
    };
  }

  if (requirement.scheme !== "exact") {
    return {
      ok: false,
      code: "WRONG_SCHEME",
      message: "Only exact payment requirements are accepted",
    };
  }

  if (requirement.network !== SOLANA_DEVNET_NETWORK) {
    return {
      ok: false,
      code: "WRONG_NETWORK",
      message: "Payment requirement must target Solana devnet",
    };
  }

  if (requirement.asset !== DEVNET_USDC_MINT) {
    return {
      ok: false,
      code: "WRONG_MINT",
      message: "Payment asset must be the pinned devnet USDC mint",
    };
  }

  if (!context.allowedServices.includes(context.serviceId)) {
    return {
      ok: false,
      code: "SERVICE_NOT_ALLOWED",
      message: "Service is not allowed by the authenticated delegation",
    };
  }

  if (context.serviceId !== context.merchantServiceId) {
    return {
      ok: false,
      code: "SERVICE_MISMATCH",
      message: "Authorized service does not match the configured merchant route",
    };
  }

  if (requirement.payTo !== context.expectedPayTo) {
    return {
      ok: false,
      code: "WRONG_RECIPIENT",
      message: "Payment recipient does not match the configured merchant",
    };
  }

  if (!/^[1-9]\d*$/.test(requirement.amount)) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Payment amount must be a positive canonical base-unit integer",
    };
  }

  const amount = BigInt(requirement.amount);
  if (amount > context.maxAmount) {
    return {
      ok: false,
      code: "AMOUNT_EXCEEDS_BUDGET",
      message: "Payment amount exceeds the delegation's current budget",
    };
  }

  return { ok: true, amount };
}
