import { generateKeyPairSync, sign } from "node:crypto";

import { getAddressDecoder } from "@solana/kit";
import { describe, expect, test } from "vitest";

import { WalletNonceStore } from "./wallet-nonce";

const now = Date.UTC(2026, 9, 12, 20, 0, 0);

function walletFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  const address = getAddressDecoder().decode(publicDer.subarray(-32));
  return { address, privateKey };
}

describe("WalletNonceStore", () => {
  test("verifies a wallet signature once and consumes the nonce", () => {
    const wallet = walletFixture();
    const store = new WalletNonceStore("http://localhost:3000");
    const challenge = store.issue(wallet.address, now);
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      wallet.privateKey,
    ).toString("base64");

    expect(
      store.verify({
        address: wallet.address,
        message: challenge.message,
        signature,
        now: now + 1,
      }),
    ).toEqual({ ok: true });
    expect(
      store.verify({
        address: wallet.address,
        message: challenge.message,
        signature,
        now: now + 2,
      }),
    ).toMatchObject({ ok: false, code: "NONCE_NOT_FOUND" });
  });

  test("rejects an expired challenge", () => {
    const wallet = walletFixture();
    const store = new WalletNonceStore("http://localhost:3000", 60_000);
    const challenge = store.issue(wallet.address, now);
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      wallet.privateKey,
    ).toString("base64");

    expect(
      store.verify({
        address: wallet.address,
        message: challenge.message,
        signature,
        now: now + 60_000,
      }),
    ).toMatchObject({ ok: false, code: "NONCE_EXPIRED" });
  });

  test("rejects a signature made by a different wallet", () => {
    const wallet = walletFixture();
    const attacker = walletFixture();
    const store = new WalletNonceStore("http://localhost:3000");
    const challenge = store.issue(wallet.address, now);
    const signature = sign(
      null,
      Buffer.from(challenge.message),
      attacker.privateKey,
    ).toString("base64");

    expect(
      store.verify({
        address: wallet.address,
        message: challenge.message,
        signature,
        now: now + 1,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SIGNATURE" });
  });
});
