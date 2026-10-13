import { createSolanaRpc } from "@solana/kit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  taskAccountStore,
  walletForSession,
} from "../../../../../src/auth/store";
import { buildTaskFundingTransaction } from "../../../../../src/solana/funding-transaction";

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
    const task = taskAccountStore.task(id);
    if (task.ownerWallet !== ownerWallet) {
      return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    }
    if (task.fundingSignature) {
      return NextResponse.json(
        { error: "TASK_ALREADY_FUNDED", signature: task.fundingSignature },
        { status: 409 },
      );
    }

    const rpc = createSolanaRpc(
      process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
    );
    const { value: latestBlockhash } = await rpc
      .getLatestBlockhash({ commitment: "confirmed" })
      .send();
    const built = await buildTaskFundingTransaction({ task, latestBlockhash });

    return NextResponse.json({
      transaction: Buffer.from(built.transactionBytes).toString("base64"),
      preview: {
        network: task.network,
        sourceOwner: ownerWallet,
        sourceAta: built.sourceAta,
        destinationOwner: task.paymentAddress,
        destinationAta: built.destinationAta,
        mint: built.mint,
        amount: built.amount,
        decimals: built.decimals,
      },
    });
  } catch {
    return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
  }
}
