import { address, createSolanaRpc, signature } from "@solana/kit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";

const requestSchema = z.object({ signature: z.string().min(64).max(100) });

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
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const task = taskAccountStore.task(id);
    if (task.ownerWallet !== ownerWallet) {
      return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    }

    const rpc = createSolanaRpc(
      process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
    );
    const [statuses, balance] = await Promise.all([
      rpc
        .getSignatureStatuses([signature(parsed.data.signature)], {
          searchTransactionHistory: true,
        })
        .send(),
      rpc.getTokenAccountBalance(address(task.paymentAta)).send(),
    ]);
    const status = statuses.value[0];
    if (
      !status ||
      status.err ||
      !["confirmed", "finalized"].includes(status.confirmationStatus ?? "") ||
      BigInt(balance.value.amount) < BigInt(task.allocation)
    ) {
      return NextResponse.json({ state: "pending" }, { status: 202 });
    }

    taskAccountStore.markFunded(id, parsed.data.signature);
    return NextResponse.json({
      state: "confirmed",
      signature: parsed.data.signature,
      explorerUrl: `https://explorer.solana.com/tx/${parsed.data.signature}?cluster=devnet`,
    });
  } catch {
    return NextResponse.json({ state: "pending" }, { status: 202 });
  }
}
