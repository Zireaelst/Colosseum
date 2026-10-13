import { generateKeyPairSync, randomBytes, sign } from "node:crypto";

import { getAddressDecoder } from "@solana/kit";
import { describe, expect, test } from "vitest";

import {
  AuthConfigurationError,
  TaskSignerConfigurationError,
  assertTaskAccountStoreConfigured,
  createWalletSession,
  issueWalletChallenge,
  verifyWalletChallenge,
  walletForSession,
} from "./store";

const now = Date.UTC(2026, 9, 13, 10, 0, 0);
const configuredEnvironment = {
  NEXT_PUBLIC_APP_ORIGIN: "https://pactlet.example",
  PACTLET_SESSION_SECRET: "pactlet-test-secret-with-at-least-32-characters",
};

function walletFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  const walletAddress = getAddressDecoder().decode(publicDer.subarray(-32));
  return { address: walletAddress, privateKey };
}

describe("auth store wrappers", () => {
  test("fail closed without a valid server-only secret", () => {
    const wallet = walletFixture();

    expect(() =>
      issueWalletChallenge(wallet.address, now, {
        NEXT_PUBLIC_APP_ORIGIN: "https://pactlet.example",
      }),
    ).toThrow(AuthConfigurationError);
    expect(() =>
      issueWalletChallenge(wallet.address, now, {
        ...configuredEnvironment,
        PACTLET_SESSION_SECRET: "too-short",
      }),
    ).toThrow(AuthConfigurationError);
  });

  test("fails live task creation closed without persistent signer configuration", () => {
    expect(() => assertTaskAccountStoreConfigured({})).toThrow(
      TaskSignerConfigurationError,
    );
    expect(() =>
      assertTaskAccountStoreConfigured({
        PACTLET_DATABASE_PATH: "./pactlet.db",
        PACTLET_SIGNER_MASTER_KEY: "invalid",
      }),
    ).toThrow(TaskSignerConfigurationError);
    expect(() =>
      assertTaskAccountStoreConfigured({
        PACTLET_DATABASE_PATH: "./pactlet.db",
        PACTLET_SIGNER_MASTER_KEY: randomBytes(32).toString("base64url"),
      }),
    ).not.toThrow();
  });

  test("verifies challenges and sessions across independent calls", () => {
    const wallet = walletFixture();
    const challenge = issueWalletChallenge(
      wallet.address,
      now,
      configuredEnvironment,
    );
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      wallet.privateKey,
    ).toString("base64");

    expect(
      verifyWalletChallenge(
        {
          address: wallet.address,
          message: challenge.message,
          signature,
          now: now + 1,
        },
        configuredEnvironment,
      ),
    ).toEqual({ ok: true });

    const token = createWalletSession(
      wallet.address,
      now + 1,
      configuredEnvironment,
    );
    expect(
      walletForSession(token, now + 2, configuredEnvironment),
    ).toBe(wallet.address);
  });
});
