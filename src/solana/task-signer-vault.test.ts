import { randomBytes } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  decryptSignerSeed,
  encryptSignerSeed,
  parseSignerMasterKey,
} from "./task-signer-vault";

describe("task signer vault", () => {
  test("accepts only a canonical base64url-encoded 32-byte master key", () => {
    const encoded = randomBytes(32).toString("base64url");

    expect(parseSignerMasterKey(encoded)).toHaveLength(32);
    expect(() => parseSignerMasterKey("")).toThrow("32-byte");
    expect(() =>
      parseSignerMasterKey(randomBytes(31).toString("base64url")),
    ).toThrow("32-byte");
    expect(() => parseSignerMasterKey(`${encoded}=`)).toThrow("base64url");
  });

  test("encrypts a seed with randomized authenticated encryption", () => {
    const masterKey = randomBytes(32);
    const seed = randomBytes(32);
    const first = encryptSignerSeed({ taskId: "task-1", seed, masterKey });
    const second = encryptSignerSeed({ taskId: "task-1", seed, masterKey });

    expect(first.ciphertext).not.toBe(seed.toString("base64url"));
    expect(first).not.toEqual(second);
    expect(
      decryptSignerSeed({ taskId: "task-1", encrypted: first, masterKey }),
    ).toEqual(new Uint8Array(seed));
  });

  test("rejects record swapping and tampered ciphertext", () => {
    const masterKey = randomBytes(32);
    const encrypted = encryptSignerSeed({
      taskId: "task-1",
      seed: randomBytes(32),
      masterKey,
    });
    const tamperedCiphertext = `${encrypted.ciphertext.startsWith("A") ? "B" : "A"}${encrypted.ciphertext.slice(1)}`;

    expect(() =>
      decryptSignerSeed({ taskId: "task-2", encrypted, masterKey }),
    ).toThrow();
    expect(() =>
      decryptSignerSeed({
        taskId: "task-1",
        encrypted: {
          ...encrypted,
          ciphertext: tamperedCiphertext,
        },
        masterKey,
      }),
    ).toThrow();
    expect(() =>
      decryptSignerSeed({
        taskId: "task-1",
        encrypted: {
          ...encrypted,
          authenticationTag: randomBytes(16).toString("base64url"),
        },
        masterKey,
      }),
    ).toThrow();
  });
});
