import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../src/auth/store";
import { jsonSafe } from "../../../../src/http/json";
import { readRuntimeReadiness } from "../../../../src/runtime/readiness";
import { ledger } from "../../../../src/runtime/store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ownerWallet = walletForSession(
    request.cookies.get("pactlet_session")?.value,
  );
  if (!ownerWallet) {
    return NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const task = taskAccountStore.task(id);
    if (task.ownerWallet !== ownerWallet) {
      return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(
      jsonSafe({
        ...ledger.taskSnapshot(id, Date.now()),
        account: task,
        readiness: readRuntimeReadiness(),
        merchantPreview: process.env.X402_MERCHANT_PAY_TO
          ? {
              serviceId: "research-api",
              resourceId: "research-brief",
              amount: "1000",
              mint: task.mint,
              payTo: process.env.X402_MERCHANT_PAY_TO,
            }
          : null,
      }),
    );
  } catch {
    return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
  }
}
