import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  taskAccountStore,
  walletForSession,
} from "../../../src/auth/store";
import { ledger } from "../../../src/runtime/store";
import { initializeTaskAuthority } from "../../../src/runtime/task-runtime";

export async function POST(request: NextRequest) {
  const ownerWallet = walletForSession(
    request.cookies.get("beeple_session")?.value,
  );
  if (!ownerWallet) {
    return NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401 });
  }

  const task = await taskAccountStore.create(ownerWallet);
  initializeTaskAuthority(ledger, { taskId: task.id, ownerWallet });
  return NextResponse.json(task, { status: 201 });
}
