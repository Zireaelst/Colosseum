import { generateKeyPairSync, sign } from "node:crypto";

import { getAddressDecoder } from "@solana/kit";
import { describe, expect, test } from "vitest";

import {
  createSessionToken,
  issueWalletChallenge,
  verifyWalletChallenge,
  walletFromSessionToken,
} from "./signed-wallet-auth";

const now = Date.UTC(2026, 9, 13, 9, 0, 0);
const origin = "https://pactlet.example";
const secret = "pactlet-test-secret-with-at-least-32-characters";

function walletFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  const walletAddress = getAddressDecoder().decode(publicDer.subarray(-32));
  return { address: walletAddress, privateKey };
}

describe("signed wallet authentication", () => {
  test("verifies an issued challenge without process-local state", () => {
    const wallet = walletFixture();
    const challenge = issueWalletChallenge({
      address: wallet.address,
      origin,
      secret,
      now,
    });
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      wallet.privateKey,
    ).toString("base64");

    expect(
      verifyWalletChallenge({
        address: wallet.address,
        message: challenge.message,
        signature,
        origin,
        secret,
        now: now + 1,
      }),
    ).toEqual({ ok: true });
  });

  test("rejects a tampered challenge", () => {
    const wallet = walletFixture();
    const challenge = issueWalletChallenge({
      address: wallet.address,
      origin,
      secret,
      now,
    });
    const tamperedMessage = challenge.message.replace(origin, "https://evil.example");
    const signature = sign(
      null,
      Buffer.from(tamperedMessage),
      wallet.privateKey,
    ).toString("base64");

    expect(
      verifyWalletChallenge({
        address: wallet.address,
        message: tamperedMessage,
        signature,
        origin,
        secret,
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, code: "MESSAGE_MISMATCH" });
  });

  test("rejects an expired challenge", () => {
    const wallet = walletFixture();
    const challenge = issueWalletChallenge({
      address: wallet.address,
      origin,
      secret,
      now,
      ttlMs: 60_000,
    });
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      wallet.privateKey,
    ).toString("base64");

    expect(
      verifyWalletChallenge({
        address: wallet.address,
        message: challenge.message,
        signature,
        origin,
        secret,
        now: now + 60_000,
      }),
    ).toMatchObject({ ok: false, code: "NONCE_EXPIRED" });
  });

  test("rejects a signature made by another wallet", () => {
    const wallet = walletFixture();
    const attacker = walletFixture();
    const challenge = issueWalletChallenge({
      address: wallet.address,
      origin,
      secret,
      now,
    });
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      attacker.privateKey,
    ).toString("base64");

    expect(
      verifyWalletChallenge({
        address: wallet.address,
        message: challenge.message,
        signature,
        origin,
        secret,
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SIGNATURE" });
  });

  test("verifies a session token without shared memory", () => {
    const wallet = walletFixture();
    const token = createSessionToken({
      address: wallet.address,
      secret,
      now,
    });

    expect(
      walletFromSessionToken({ token, secret, now: now + 1 }),
    ).toBe(wallet.address);
  });

  test("rejects tampered and expired session tokens", () => {
    const wallet = walletFixture();
    const token = createSessionToken({
      address: wallet.address,
      secret,
      now,
      ttlMs: 60_000,
    });
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(walletFromSessionToken({ token: tampered, secret, now: now + 1 })).toBeNull();
    expect(
      walletFromSessionToken({ token, secret, now: now + 60_000 }),
    ).toBeNull();
  });

  test("rejects secrets shorter than 32 characters", () => {
    const wallet = walletFixture();

    expect(() =>
      issueWalletChallenge({
        address: wallet.address,
        origin,
        secret: "too-short",
        now,
      }),
    ).toThrow("at least 32 characters");
  });
});
