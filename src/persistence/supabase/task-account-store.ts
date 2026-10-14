import { randomBytes, randomUUID } from "node:crypto";

import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  type KeyPairSigner,
} from "@solana/kit";

import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../../policy/payment-terms";
import type { TaskAccountRepository } from "../ports";
import {
  decryptSignerSeed,
  encryptSignerSeed,
} from "../../solana/task-signer-vault";
import type { PublicTaskAccount } from "../../solana/task-accounts";
import type {
  SupabaseTaskAccountGateway,
  TaskAccountDatabaseRow,
} from "./client";

export class SupabaseTaskAccountStore implements TaskAccountRepository {
  private readonly masterKey: Uint8Array;

  constructor(
    private readonly gateway: SupabaseTaskAccountGateway,
    masterKey: Uint8Array,
  ) {
    this.masterKey = new Uint8Array(masterKey);
    if (this.masterKey.byteLength !== 32) {
      throw new Error("Signer master key must be exactly 32 bytes");
    }
  }

  async create(ownerWallet: string): Promise<PublicTaskAccount> {
    const id = randomUUID();
    const seed = randomBytes(32);
    try {
      const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
      const [paymentAta] = await findAssociatedTokenPda({
        owner: signer.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        mint: address(DEVNET_USDC_MINT),
      });
      const encrypted = encryptSignerSeed({
        taskId: id,
        seed,
        masterKey: this.masterKey,
      });
      await this.gateway.insertTaskAccount({
        id,
        owner_wallet: ownerWallet,
        network: SOLANA_DEVNET_NETWORK,
        mint: DEVNET_USDC_MINT,
        allocation_units: "10000000",
        payment_address: signer.address,
        payment_ata: paymentAta,
        funding_signature: null,
        signer_algorithm: encrypted.algorithm,
        signer_iv: encrypted.iv,
        signer_ciphertext: encrypted.ciphertext,
        signer_authentication_tag: encrypted.authenticationTag,
        created_at_ms: Date.now(),
      });
      return this.task(id);
    } finally {
      seed.fill(0);
    }
  }

  async signer(taskId: string): Promise<KeyPairSigner> {
    const row = await this.row(taskId);
    const seed = decryptSignerSeed({
      taskId,
      encrypted: {
        algorithm: row.signer_algorithm,
        iv: row.signer_iv,
        ciphertext: row.signer_ciphertext,
        authenticationTag: row.signer_authentication_tag,
      },
      masterKey: this.masterKey,
    });
    try {
      const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
      if (signer.address !== row.payment_address) {
        throw new Error("Stored signer does not match the task payment address");
      }
      return signer;
    } finally {
      seed.fill(0);
    }
  }

  async task(taskId: string): Promise<PublicTaskAccount> {
    const row = await this.row(taskId);
    if (
      row.network !== SOLANA_DEVNET_NETWORK ||
      row.mint !== DEVNET_USDC_MINT ||
      String(row.allocation_units) !== "10000000"
    ) {
      throw new Error(`Task '${taskId}' has invalid devnet payment metadata`);
    }
    return {
      id: row.id,
      ownerWallet: row.owner_wallet,
      network: SOLANA_DEVNET_NETWORK,
      mint: DEVNET_USDC_MINT,
      allocation: "10000000",
      paymentAddress: row.payment_address,
      paymentAta: row.payment_ata,
      ...(row.funding_signature
        ? { fundingSignature: row.funding_signature }
        : {}),
    };
  }

  async markFunded(
    taskId: string,
    fundingSignature: string,
  ): Promise<PublicTaskAccount> {
    if (!(await this.gateway.markTaskFunded(taskId, fundingSignature))) {
      throw new Error(`Unknown task or conflicting funding signature '${taskId}'`);
    }
    return this.task(taskId);
  }

  private async row(taskId: string): Promise<TaskAccountDatabaseRow> {
    const row = await this.gateway.findTaskAccount(taskId);
    if (!row) throw new Error(`Unknown task '${taskId}'`);
    return row;
  }
}
