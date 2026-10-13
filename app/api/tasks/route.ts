import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  TaskSignerConfigurationError,
  assertTaskAccountStoreConfigured,
  taskAccountStore,
  walletForSession,
} from "../../../src/auth/store";
import { ledger } from "../../../src/runtime/store";
import { initializeTaskAuthority } from "../../../src/runtime/task-runtime";

export async function POST(request: NextRequest) {
  const ownerWallet = walletForSession(
    request.cookies.get("pactlet_session")?.value,
  );
  if (!ownerWallet) {
    return NextResponse.json({ error: "WALLET_AUTH_REQUIRED" }, { status: 401 });
  }

  try {
    assertTaskAccountStoreConfigured();
  } catch (error) {
    if (error instanceof TaskSignerConfigurationError) {
      return NextResponse.json(
        { error: error.code },
        { status: 503 },
      );
    }
    throw error;
  }

  const task = await taskAccountStore.create(ownerWallet);
  initializeTaskAuthority(ledger, { taskId: task.id, ownerWallet });
  return NextResponse.json(task, { status: 201 });
}
