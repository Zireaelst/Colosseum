import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";
import { PurchaseService } from "../../../../../src/payments/purchase-service";
import { X402FetchTransport } from "../../../../../src/payments/x402-fetch-transport";
import { ledger } from "../../../../../src/runtime/store";
import { runtimeIds } from "../../../../../src/runtime/task-runtime";

const bodySchema = z.object({
  purchaseKey: z.string().min(1).max(100),
  serviceId: z.literal("research-api"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ownerWallet = walletForSession(
    request.cookies.get("beeple_session")?.value,
  );
  if (!ownerWallet) {
    return NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401 });
  }

  const { id } = await context.params;
  const task = taskAccountStore.task(id);
  if (task.ownerWallet !== ownerWallet) {
    return NextResponse.json({ error: "TASK_NOT_OWNED" }, { status: 403 });
  }
  if (!task.fundingSignature) {
    return NextResponse.json({ error: "TASK_NOT_FUNDED" }, { status: 409 });
  }

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_PURCHASE_REQUEST" }, { status: 400 });
  }
  const payTo = process.env.X402_MERCHANT_PAY_TO;
  if (!payTo) {
    return NextResponse.json({ error: "MERCHANT_NOT_CONFIGURED" }, { status: 503 });
  }

  const service = new PurchaseService({
    ledger,
    merchant: {
      serviceId: "research-api",
      url: process.env.X402_MERCHANT_URL ?? "http://127.0.0.1:4021/research",
      payTo,
    },
    transport: new X402FetchTransport(),
    signerForTask: (taskId) => taskAccountStore.signer(taskId),
  });
  const result = await service.purchase({
    taskId: id,
    delegationId: runtimeIds(id).research,
    purchaseKey: body.data.purchaseKey,
    serviceId: body.data.serviceId,
  });

  return NextResponse.json(
    result.ok ? { ...result, amount: result.amount.toString() } : result,
    { status: result.ok ? 200 : result.state === "settlement_pending" ? 202 : 409 },
  );
}
