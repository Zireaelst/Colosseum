import {
  createPublicKey,
  randomBytes,
  verify as verifyEd25519,
} from "node:crypto";

import { address, getAddressEncoder } from "@solana/kit";

interface NonceRecord {
  message: string;
  expiresAt: number;
}

export interface WalletChallenge extends NonceRecord {
  address: string;
}

export type WalletVerificationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "NONCE_NOT_FOUND"
        | "NONCE_EXPIRED"
        | "MESSAGE_MISMATCH"
        | "INVALID_SIGNATURE";
    };

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export class WalletNonceStore {
  private readonly nonces = new Map<string, NonceRecord>();

  constructor(
    private readonly origin: string,
    private readonly ttlMs = 5 * 60_000,
  ) {}

  issue(walletAddress: string, now = Date.now()): WalletChallenge {
    const canonicalAddress = address(walletAddress);
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = now + this.ttlMs;
    const message = [
      "beeple wallet authentication",
      `Origin: ${this.origin}`,
      `Address: ${canonicalAddress}`,
      `Nonce: ${nonce}`,
      `Expires At: ${new Date(expiresAt).toISOString()}`,
    ].join("\n");

    this.nonces.set(canonicalAddress, { message, expiresAt });
    return { address: canonicalAddress, message, expiresAt };
  }

  verify(input: {
    address: string;
    message: string;
    signature: string;
    now?: number;
  }): WalletVerificationResult {
    const now = input.now ?? Date.now();
    const canonicalAddress = address(input.address);
    const record = this.nonces.get(canonicalAddress);

    if (record === undefined) {
      return { ok: false, code: "NONCE_NOT_FOUND" };
    }
    if (record.expiresAt <= now) {
      this.nonces.delete(canonicalAddress);
      return { ok: false, code: "NONCE_EXPIRED" };
    }
    if (record.message !== input.message) {
      return { ok: false, code: "MESSAGE_MISMATCH" };
    }

    const signature = Buffer.from(input.signature, "base64");
    if (signature.length !== 64) {
      return { ok: false, code: "INVALID_SIGNATURE" };
    }

    const publicKeyBytes = getAddressEncoder().encode(canonicalAddress);
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    });
    const valid = verifyEd25519(
      null,
      Buffer.from(record.message),
      publicKey,
      signature,
    );

    if (!valid) {
      return { ok: false, code: "INVALID_SIGNATURE" };
    }

    this.nonces.delete(canonicalAddress);
    return { ok: true };
  }
}
