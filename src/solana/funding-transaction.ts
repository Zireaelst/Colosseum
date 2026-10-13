import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  address,
  appendTransactionMessageInstructions,
  blockhash,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";

import type { PublicTaskAccount } from "./task-accounts";

export async function buildTaskFundingTransaction(input: {
  task: PublicTaskAccount;
  latestBlockhash: { blockhash: string; lastValidBlockHeight: bigint };
}) {
  const owner = address(input.task.ownerWallet);
  const mint = address(input.task.mint);
  const destinationAta = address(input.task.paymentAta);
  const payer = createNoopSigner(owner);
  const [sourceAta] = await findAssociatedTokenPda({
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint,
  });

  const createDestination = getCreateAssociatedTokenIdempotentInstruction({
    payer,
    ata: destinationAta,
    owner: address(input.task.paymentAddress),
    mint,
  });
  const transfer = getTransferCheckedInstruction({
    source: sourceAta,
    mint,
    destination: destinationAta,
    authority: payer,
    amount: 10_000_000n,
    decimals: 6,
  });
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (current) => setTransactionMessageFeePayerSigner(payer, current),
    (current) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash(input.latestBlockhash.blockhash),
          lastValidBlockHeight: input.latestBlockhash.lastValidBlockHeight,
        },
        current,
      ),
    (current) =>
      appendTransactionMessageInstructions(
        [createDestination, transfer],
        current,
      ),
  );

  return {
    transactionBytes: getTransactionEncoder().encode(compileTransaction(message)),
    sourceAta,
    destinationAta,
    mint,
    amount: "10000000" as const,
    decimals: 6 as const,
  };
}
