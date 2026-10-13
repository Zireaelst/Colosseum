import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export interface EncryptedSignerSeed {
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  authenticationTag: string;
}

function decodeCanonicalBase64Url(value: string, label: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} must be canonical base64url`);
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error(`${label} must be canonical base64url`);
  }
  return decoded;
}

function assertMasterKey(masterKey: Uint8Array): Buffer {
  if (masterKey.byteLength !== 32) {
    throw new Error("Signer master key must be exactly 32 bytes");
  }
  return Buffer.from(masterKey);
}

export function parseSignerMasterKey(value: string): Uint8Array {
  let decoded: Buffer;
  try {
    decoded = decodeCanonicalBase64Url(value, "Signer master key");
  } catch {
    if (value === "") {
      throw new Error("Signer master key must be a base64url-encoded 32-byte key");
    }
    throw new Error("Signer master key must use canonical base64url encoding");
  }
  if (decoded.byteLength !== 32) {
    throw new Error("Signer master key must decode to a 32-byte key");
  }
  return new Uint8Array(decoded);
}

export function encryptSignerSeed(input: {
  taskId: string;
  seed: Uint8Array;
  masterKey: Uint8Array;
}): EncryptedSignerSeed {
  if (input.seed.byteLength !== 32) {
    throw new Error("Solana signer seed must be exactly 32 bytes");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    assertMasterKey(input.masterKey),
    iv,
  );
  cipher.setAAD(Buffer.from(input.taskId, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(input.seed)),
    cipher.final(),
  ]);

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    authenticationTag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptSignerSeed(input: {
  taskId: string;
  encrypted: EncryptedSignerSeed;
  masterKey: Uint8Array;
}): Uint8Array {
  if (input.encrypted.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported signer encryption algorithm");
  }
  const iv = decodeCanonicalBase64Url(input.encrypted.iv, "Signer IV");
  const ciphertext = decodeCanonicalBase64Url(
    input.encrypted.ciphertext,
    "Signer ciphertext",
  );
  const authenticationTag = decodeCanonicalBase64Url(
    input.encrypted.authenticationTag,
    "Signer authentication tag",
  );
  if (iv.byteLength !== 12 || authenticationTag.byteLength !== 16) {
    throw new Error("Invalid encrypted signer record");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    assertMasterKey(input.masterKey),
    iv,
  );
  decipher.setAAD(Buffer.from(input.taskId, "utf8"));
  decipher.setAuthTag(authenticationTag);
  const seed = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  if (seed.byteLength !== 32) {
    throw new Error("Invalid decrypted Solana signer seed");
  }
  return new Uint8Array(seed);
}
