import { randomUUID } from "node:crypto";

import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  address,
  generateKeyPairSigner,
  type KeyPairSigner,
} from "@solana/kit";

import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../policy/payment-terms";

export interface PublicTaskAccount {
  id: string;
  ownerWallet: string;
  network: typeof SOLANA_DEVNET_NETWORK;
  mint: typeof DEVNET_USDC_MINT;
  allocation: "10000000";
  paymentAddress: string;
  paymentAta: string;
  fundingSignature?: string;
}

export class TaskAccountStore {
  private readonly signers = new Map<string, KeyPairSigner>();
  private readonly tasks = new Map<string, PublicTaskAccount>();

  async create(ownerWallet: string): Promise<PublicTaskAccount> {
    const id = randomUUID();
    const signer = await generateKeyPairSigner();
    const [paymentAta] = await findAssociatedTokenPda({
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      mint: address(DEVNET_USDC_MINT),
    });
    this.signers.set(id, signer);

    const task: PublicTaskAccount = {
      id,
      ownerWallet,
      network: SOLANA_DEVNET_NETWORK,
      mint: DEVNET_USDC_MINT,
      allocation: "10000000",
      paymentAddress: signer.address,
      paymentAta,
    };
    this.tasks.set(id, task);
    return task;
  }

  signer(taskId: string): KeyPairSigner {
    const signer = this.signers.get(taskId);
    if (signer === undefined) throw new Error(`Unknown task '${taskId}'`);
    return signer;
  }

  task(taskId: string): PublicTaskAccount {
    const task = this.tasks.get(taskId);
    if (task === undefined) throw new Error(`Unknown task '${taskId}'`);
    return task;
  }

  markFunded(taskId: string, fundingSignature: string): PublicTaskAccount {
    const current = this.task(taskId);
    const funded = { ...current, fundingSignature };
    this.tasks.set(taskId, funded);
    return funded;
  }
}
