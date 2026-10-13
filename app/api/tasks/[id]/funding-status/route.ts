import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { address, createSolanaRpc, signature } from "@solana/kit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";
import { verifyFundingEvidence } from "../../../../../src/solana/funding-evidence";

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
    const sourceOwner = address(ownerWallet);
    const [sourceAta] = await findAssociatedTokenPda({
      owner: sourceOwner,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      mint: address(task.mint),
    });
    const transaction = await rpc
      .getTransaction(signature(parsed.data.signature), {
        commitment: "confirmed",
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      })
      .send();
    if (!transaction) {
      return NextResponse.json({ state: "pending" }, { status: 202 });
    }
    if (
      !verifyFundingEvidence({
        signature: parsed.data.signature,
        sourceOwner,
        sourceAta,
        destinationAta: task.paymentAta,
        mint: task.mint,
        amount: BigInt(task.allocation),
        decimals: 6,
        transaction,
      })
    ) {
      return NextResponse.json(
        { state: "rejected", error: "FUNDING_EVIDENCE_MISMATCH" },
        { status: 422 },
      );
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
