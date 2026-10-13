import { getTransactionDecoder } from "@solana/kit";
import { describe, expect, test } from "vitest";

import { buildTaskFundingTransaction } from "./funding-transaction";
import { TaskAccountStore } from "./task-accounts";

describe("buildTaskFundingTransaction", () => {
  test("builds one wallet-signed devnet USDC funding transaction", async () => {
    const task = await new TaskAccountStore().create(
      "seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX",
    );
    const built = await buildTaskFundingTransaction({
      task,
      latestBlockhash: {
        blockhash: "11111111111111111111111111111111",
        lastValidBlockHeight: 123n,
      },
    });

    expect(built).toMatchObject({
      amount: "10000000",
      decimals: 6,
      destinationAta: task.paymentAta,
    });
    expect(getTransactionDecoder().decode(built.transactionBytes)).toBeDefined();
  });
});
