import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { runPactletManager } from "../../../../../src/agents/orchestrator";
import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";
import { PurchaseService } from "../../../../../src/payments/purchase-service";
import { X402FetchTransport } from "../../../../../src/payments/x402-fetch-transport";
import { ledger } from "../../../../../src/runtime/store";
import { runtimeIds } from "../../../../../src/runtime/task-runtime";
import {
  TASK_RESOURCE_ID,
  TASK_SERVICE_ID,
} from "../../../../../src/runtime/task-mandate";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2_000),
  purchaseRef: z.string().min(1).max(100),
}).strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ownerWallet = walletForSession(
    request.cookies.get("pactlet_session")?.value,
  );
  if (!ownerWallet) {
    return NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401 });
  }
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_AGENT_REQUEST" }, { status: 400 });
  }
  const { id } = await context.params;
  const task = await taskAccountStore.task(id);
  if (task.ownerWallet !== ownerWallet) {
    return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
  }

  const payTo = process.env.X402_MERCHANT_PAY_TO;
  const purchaseService = payTo
    ? new PurchaseService({
        ledger,
        merchant: {
          serviceId: TASK_SERVICE_ID,
          resourceId: TASK_RESOURCE_ID,
          url:
            process.env.X402_MERCHANT_URL ??
            "http://127.0.0.1:4021/research",
          payTo,
        },
        transport: new X402FetchTransport(),
        signerForTask: (taskId) => taskAccountStore.signer(taskId),
      })
    : null;

  const result = await runPactletManager({
    prompt: body.data.prompt,
    purchase: async () => {
      if (!task.fundingSignature) {
        return { ok: false, code: "TASK_NOT_FUNDED", state: "rejected" };
      }
      if (!purchaseService) {
        return { ok: false, code: "MERCHANT_NOT_CONFIGURED", state: "rejected" };
      }
      return purchaseService.purchase({
        taskId: id,
        delegationId: runtimeIds(id).research,
        purchaseRef: body.data.purchaseRef,
        serviceId: TASK_SERVICE_ID,
        resourceId: TASK_RESOURCE_ID,
      });
    },
  });
  return NextResponse.json(result);
}
