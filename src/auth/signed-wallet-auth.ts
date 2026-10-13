import {
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifyEd25519,
} from "node:crypto";

import { address, getAddressEncoder } from "@solana/kit";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const DEFAULT_CHALLENGE_TTL_MS = 5 * 60_000;
const DEFAULT_SESSION_TTL_MS = 30 * 60_000;

interface ChallengePayload {
  v: 1;
  kind: "wallet-challenge";
  origin: string;
  address: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

interface SessionPayload {
  v: 1;
  kind: "wallet-session";
  address: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface WalletChallenge {
  address: string;
  message: string;
  expiresAt: number;
}

export type WalletVerificationResult =
  | { ok: true }
  | {
      ok: false;
      code: "NONCE_EXPIRED" | "MESSAGE_MISMATCH" | "INVALID_SIGNATURE";
    };

function validateSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error("PACTLET_SESSION_SECRET must contain at least 32 characters");
  }
}

function signPayload(payload: ChallengePayload | SessionPayload, secret: string): string {
  validateSecret(secret);
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${mac}`;
}

function decodePayload<T>(token: string, secret: string): T | null {
  validateSecret(secret);
  const [encodedPayload, encodedMac, extra] = token.split(".");
  if (!encodedPayload || !encodedMac || extra !== undefined) return null;

  const actual = Buffer.from(encodedMac, "base64url");
  const expected = createHmac("sha256", secret).update(encodedPayload).digest();
  if (
    actual.toString("base64url") !== encodedMac ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function challengeMessage(payload: ChallengePayload, token: string): string {
  return [
    "pactlet wallet authentication",
    `Origin: ${payload.origin}`,
    `Address: ${payload.address}`,
    `Nonce: ${payload.nonce}`,
    `Expires At: ${new Date(payload.expiresAt).toISOString()}`,
    `Challenge: ${token}`,
  ].join("\n");
}

function tokenFromMessage(message: string): string | null {
  const lines = message.split("\n");
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line?.startsWith("Challenge: ")) {
      return line.slice("Challenge: ".length);
    }
  }
  return null;
}

export function issueWalletChallenge(input: {
  address: string;
  origin: string;
  secret: string;
  now?: number;
  ttlMs?: number;
}): WalletChallenge {
  const now = input.now ?? Date.now();
  const canonicalAddress = address(input.address);
  const payload: ChallengePayload = {
    v: 1,
    kind: "wallet-challenge",
    origin: input.origin,
    address: canonicalAddress,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: now,
    expiresAt: now + (input.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS),
  };
  const token = signPayload(payload, input.secret);
  return {
    address: canonicalAddress,
    message: challengeMessage(payload, token),
    expiresAt: payload.expiresAt,
  };
}

export function verifyWalletChallenge(input: {
  address: string;
  message: string;
  signature: string;
  origin: string;
  secret: string;
  now?: number;
}): WalletVerificationResult {
  const now = input.now ?? Date.now();
  const canonicalAddress = address(input.address);
  const token = tokenFromMessage(input.message);
  if (!token) return { ok: false, code: "MESSAGE_MISMATCH" };

  const payload = decodePayload<ChallengePayload>(token, input.secret);
  if (
    !payload ||
    payload.v !== 1 ||
    payload.kind !== "wallet-challenge" ||
    payload.origin !== input.origin ||
    payload.address !== canonicalAddress ||
    payload.issuedAt > now + 60_000 ||
    challengeMessage(payload, token) !== input.message
  ) {
    return { ok: false, code: "MESSAGE_MISMATCH" };
  }
  if (payload.expiresAt <= now) {
    return { ok: false, code: "NONCE_EXPIRED" };
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
    Buffer.from(input.message),
    publicKey,
    signature,
  );
  return valid ? { ok: true } : { ok: false, code: "INVALID_SIGNATURE" };
}

export function createSessionToken(input: {
  address: string;
  secret: string;
  now?: number;
  ttlMs?: number;
}): string {
  const now = input.now ?? Date.now();
  return signPayload(
    {
      v: 1,
      kind: "wallet-session",
      address: address(input.address),
      nonce: randomBytes(16).toString("hex"),
      issuedAt: now,
      expiresAt: now + (input.ttlMs ?? DEFAULT_SESSION_TTL_MS),
    },
    input.secret,
  );
}

export function walletFromSessionToken(input: {
  token: string | undefined;
  secret: string;
  now?: number;
}): string | null {
  if (!input.token) return null;
  const now = input.now ?? Date.now();
  const payload = decodePayload<SessionPayload>(input.token, input.secret);
  if (
    !payload ||
    payload.v !== 1 ||
    payload.kind !== "wallet-session" ||
    payload.issuedAt > now + 60_000 ||
    payload.expiresAt <= now
  ) {
    return null;
  }

  try {
    return address(payload.address);
  } catch {
    return null;
  }
}
