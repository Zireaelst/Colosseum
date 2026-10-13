import type { PaymentRequired, SettleResponse } from "@x402/core/types";
import { afterEach, describe, expect, test, vi } from "vitest";

import { Ledger } from "../ledger/ledger";
import {
  DEVNET_USDC_MINT,
  SOLANA_DEVNET_NETWORK,
} from "../policy/payment-terms";
import {
  PurchaseService,
  type PaymentTransport,
} from "./purchase-service";

const now = Date.UTC(2026, 9, 13, 6, 0, 0);
const merchant = {
  serviceId: "research-api",
  url: "http://127.0.0.1:4021/research",
  payTo: "merchant-owner",
} as const;

function challenge(
  overrides: Partial<Omit<PaymentRequired["accepts"][number], "network">> & {
    network?: string;
  } = {},
) {
  return {
    x402Version: 2 as const,
    resource: {
      url: merchant.url,
      description: "beeple research",
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: SOLANA_DEVNET_NETWORK,
        amount: "1000",
        asset: DEVNET_USDC_MINT,
        payTo: merchant.payTo,
        maxTimeoutSeconds: 60,
        extra: {},
        ...overrides,
      },
    ],
  } as PaymentRequired;
}

function settled(): SettleResponse {
  return {
    success: true,
    transaction: "devnet-signature",
    network: SOLANA_DEVNET_NETWORK,
  };
}

const openLedgers: Ledger[] = [];

function fixture(paymentRequired: unknown = challenge()) {
  const ledger = Ledger.memory();
  openLedgers.push(ledger);
  ledger.createTask({
    id: "task-1",
    ownerWallet: "owner",
    allocation: 10_000_000n,
    expiresAt: now + 60_000,
  });
  ledger.createDelegation({
    id: "research-agent",
    taskId: "task-1",
    parentId: null,
    allocation: 4_000_000n,
    expiresAt: now + 30_000,
    services: [merchant.serviceId],
    now,
  });

  const transport: PaymentTransport = {
    getChallenge: vi.fn().mockResolvedValue(paymentRequired),
    pay: vi.fn(async ({ onSigned }) => {
      onSigned();
      return settled();
    }),
    verifySettlement: vi.fn().mockResolvedValue(true),
  };
  const service = new PurchaseService({
    ledger,
    merchant,
    transport,
    signerForTask: () => ({ address: "task-signer" }) as never,
  });
  return { ledger, service, transport };
}

afterEach(() => {
  for (const ledger of openLedgers.splice(0)) ledger.close();
});

describe("PurchaseService", () => {
  test("validates, reserves, signs and stores a successful x402 settlement", async () => {
    const { ledger, service, transport } = fixture();

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "purchase-1",
      serviceId: merchant.serviceId,
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      state: "settled",
      transactionSignature: "devnet-signature",
      amount: 1000n,
    });
    expect(transport.pay).toHaveBeenCalledTimes(1);
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(3_999_000n);
  });

  test("replays the stored outcome without creating a second payment", async () => {
    const { service, transport } = fixture();
    const input = {
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "purchase-1",
      serviceId: merchant.serviceId,
      now,
    };

    await service.purchase(input);
    const replay = await service.purchase({ ...input, now: now + 1 });

    expect(replay).toMatchObject({ ok: true, replayed: true, state: "settled" });
    expect(transport.pay).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["wrong mint", { asset: "wrong-mint" }],
    ["wrong network", { network: "solana:wrong" }],
    ["wrong recipient", { payTo: "attacker" }],
    ["wrong scheme", { scheme: "upto" }],
    ["over budget", { amount: "4000001" }],
  ])("rejects %s before signing", async (_label, overrides) => {
    const { service, transport } = fixture(challenge(overrides));

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "blocked",
      serviceId: merchant.serviceId,
      now,
    });

    expect(result.ok).toBe(false);
    expect(transport.pay).not.toHaveBeenCalled();
  });

  test("does not accept an arbitrary service or URL", async () => {
    const { service, transport } = fixture();

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "blocked",
      serviceId: "https://attacker.example/paid",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "SERVICE_NOT_CONFIGURED" });
    expect(transport.getChallenge).not.toHaveBeenCalled();
  });

  test("keeps a signed transport timeout pending for reconciliation", async () => {
    const { ledger, service, transport } = fixture();
    vi.mocked(transport.pay).mockImplementationOnce(async ({ onSigned }) => {
      onSigned();
      throw new Error("timeout");
    });

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "uncertain",
      serviceId: merchant.serviceId,
      now,
    });

    expect(result).toMatchObject({ ok: false, state: "settlement_pending" });
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(3_999_000n);
  });

  test("keeps a facilitator success pending until devnet RPC confirms it", async () => {
    const { ledger, service, transport } = fixture();
    vi.mocked(transport.verifySettlement).mockResolvedValueOnce(false);

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "unconfirmed",
      serviceId: merchant.serviceId,
      now,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "SETTLEMENT_UNCONFIRMED",
      state: "settlement_pending",
    });
    expect(
      ledger.paymentRequest(result.paymentRequestId as string).transactionSignature,
    ).toBe("devnet-signature");
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(3_999_000n);

    vi.mocked(transport.verifySettlement).mockResolvedValueOnce(true);
    const reconciled = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "unconfirmed",
      serviceId: merchant.serviceId,
      now: now + 1,
    });
    expect(reconciled).toMatchObject({
      ok: true,
      replayed: true,
      state: "settled",
      transactionSignature: "devnet-signature",
    });
    expect(transport.pay).toHaveBeenCalledTimes(1);
  });

  test("releases a definite failed settlement", async () => {
    const { ledger, service, transport } = fixture();
    vi.mocked(transport.pay).mockImplementationOnce(async ({ onSigned }) => {
      onSigned();
      return {
        success: false,
        errorReason: "insufficient_funds",
        transaction: "",
        network: SOLANA_DEVNET_NETWORK,
      };
    });

    const result = await service.purchase({
      taskId: "task-1",
      delegationId: "research-agent",
      purchaseKey: "failed",
      serviceId: merchant.serviceId,
      now,
    });

    expect(result).toMatchObject({ ok: false, state: "failed" });
    expect(ledger.availableAmount("research-agent", now + 1)).toBe(4_000_000n);
  });
});
