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
import { parseTaskMandate } from "../../../src/runtime/task-mandate";

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

  let mandate;
  try {
    mandate = parseTaskMandate(await request.json());
  } catch {
    return NextResponse.json({ error: "INVALID_TASK_MANDATE" }, { status: 400 });
  }

  const task = await taskAccountStore.create(ownerWallet);
  await initializeTaskAuthority(ledger, {
    taskId: task.id,
    ownerWallet,
    mandate,
  });
  return NextResponse.json(task, { status: 201 });
}
