import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";
import { ledger } from "../../../../../src/runtime/store";
import { runtimeIds } from "../../../../../src/runtime/task-runtime";

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
  try {
    const { id } = await context.params;
    if (taskAccountStore.task(id).ownerWallet !== ownerWallet) {
      return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    }
    ledger.cancelDelegation(runtimeIds(id).research, Date.now());
    return NextResponse.json({ state: "cancelled", delegation: "research" });
  } catch {
    return NextResponse.json({ error: "ALREADY_CANCELLED_OR_UNKNOWN" }, { status: 409 });
  }
}
