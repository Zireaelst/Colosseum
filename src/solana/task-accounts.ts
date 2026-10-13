import { randomBytes, randomUUID } from "node:crypto";

import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  type KeyPairSigner,
} from "@solana/kit";
import Database from "better-sqlite3";

import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../policy/payment-terms";
import {
  decryptSignerSeed,
  encryptSignerSeed,
  type EncryptedSignerSeed,
} from "./task-signer-vault";

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

interface TaskAccountRow {
  id: string;
  owner_wallet: string;
  network: string;
  mint: string;
  allocation_units: string;
  payment_address: string;
  payment_ata: string;
  funding_signature: string | null;
  signer_algorithm: EncryptedSignerSeed["algorithm"];
  signer_iv: string;
  signer_ciphertext: string;
  signer_authentication_tag: string;
}

const schema = `
  CREATE TABLE IF NOT EXISTS task_accounts (
    id TEXT PRIMARY KEY,
    owner_wallet TEXT NOT NULL,
    network TEXT NOT NULL,
    mint TEXT NOT NULL,
    allocation_units TEXT NOT NULL,
    payment_address TEXT NOT NULL UNIQUE,
    payment_ata TEXT NOT NULL UNIQUE,
    funding_signature TEXT,
    signer_algorithm TEXT NOT NULL CHECK (signer_algorithm = 'aes-256-gcm'),
    signer_iv TEXT NOT NULL,
    signer_ciphertext TEXT NOT NULL,
    signer_authentication_tag TEXT NOT NULL
  );
`;

export class TaskAccountStore {
  private readonly database: Database.Database;
  private readonly masterKey: Uint8Array;

  constructor(path = ":memory:", masterKey?: Uint8Array) {
    const resolvedMasterKey =
      masterKey === undefined
        ? new Uint8Array(randomBytes(32))
        : new Uint8Array(masterKey);
    if (resolvedMasterKey.byteLength !== 32) {
      throw new Error("Signer master key must be exactly 32 bytes");
    }
    this.database = new Database(path);
    this.masterKey = resolvedMasterKey;
    this.configure();
  }

  static open(path: string, masterKey: Uint8Array): TaskAccountStore {
    return new TaskAccountStore(path, masterKey);
  }

  private configure(): void {
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("busy_timeout = 5000");
    this.database.exec(schema);
  }

  close(): void {
    this.database.close();
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

      this.database
        .prepare(
          `INSERT INTO task_accounts (
            id, owner_wallet, network, mint, allocation_units,
            payment_address, payment_ata, signer_algorithm, signer_iv,
            signer_ciphertext, signer_authentication_tag
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          ownerWallet,
          SOLANA_DEVNET_NETWORK,
          DEVNET_USDC_MINT,
          "10000000",
          signer.address,
          paymentAta,
          encrypted.algorithm,
          encrypted.iv,
          encrypted.ciphertext,
          encrypted.authenticationTag,
        );

      return this.task(id);
    } finally {
      seed.fill(0);
    }
  }

  async signer(taskId: string): Promise<KeyPairSigner> {
    const row = this.row(taskId);
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

  task(taskId: string): PublicTaskAccount {
    const row = this.row(taskId);
    if (
      row.network !== SOLANA_DEVNET_NETWORK ||
      row.mint !== DEVNET_USDC_MINT ||
      row.allocation_units !== "10000000"
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

  markFunded(taskId: string, fundingSignature: string): PublicTaskAccount {
    const result = this.database
      .prepare(
        `UPDATE task_accounts SET funding_signature = ?
         WHERE id = ? AND (funding_signature IS NULL OR funding_signature = ?)`,
      )
      .run(fundingSignature, taskId, fundingSignature);
    if (result.changes === 0) {
      throw new Error(`Unknown task or conflicting funding signature '${taskId}'`);
    }
    return this.task(taskId);
  }

  private row(taskId: string): TaskAccountRow {
    const row = this.database
      .prepare("SELECT * FROM task_accounts WHERE id = ?")
      .get(taskId) as TaskAccountRow | undefined;
    if (row === undefined) throw new Error(`Unknown task '${taskId}'`);
    return row;
  }
}
