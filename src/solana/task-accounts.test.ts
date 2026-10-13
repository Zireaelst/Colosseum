import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../policy/payment-terms";
import { TaskAccountStore } from "./task-accounts";

const stores: TaskAccountStore[] = [];
const directories: string[] = [];

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("TaskAccountStore", () => {
  test("creates distinct disposable devnet accounts without exposing key material", async () => {
    const store = new TaskAccountStore();
    const first = await store.create("wallet-owner");
    const second = await store.create("wallet-owner");

    expect(first).toMatchObject({
      ownerWallet: "wallet-owner",
      network: SOLANA_DEVNET_NETWORK,
      mint: DEVNET_USDC_MINT,
      allocation: "10000000",
    });
    expect(first.paymentAddress).not.toBe(second.paymentAddress);
    expect(first.paymentAta).not.toBe(second.paymentAta);
    expect(first).not.toHaveProperty("keyPair");
    expect(first).not.toHaveProperty("secretKey");
    expect((await store.signer(first.id)).address).toBe(first.paymentAddress);
    store.close();
  });

  test("reopens encrypted task metadata and signer from SQLite", async () => {
    const directory = mkdtempSync(join(tmpdir(), "pactlet-task-store-"));
    directories.push(directory);
    const databasePath = join(directory, "pactlet.db");
    const masterKey = randomBytes(32);
    const firstStore = TaskAccountStore.open(databasePath, masterKey);
    const created = await firstStore.create("wallet-owner");
    firstStore.markFunded(created.id, "confirmed-devnet-signature");
    firstStore.close();

    const reopened = TaskAccountStore.open(databasePath, masterKey);
    stores.push(reopened);

    expect(reopened.task(created.id)).toEqual({
      ...created,
      fundingSignature: "confirmed-devnet-signature",
    });
    expect((await reopened.signer(created.id)).address).toBe(
      created.paymentAddress,
    );
  });

  test("cannot decrypt a persisted signer with a different master key", async () => {
    const directory = mkdtempSync(join(tmpdir(), "pactlet-task-store-"));
    directories.push(directory);
    const databasePath = join(directory, "pactlet.db");
    const firstStore = TaskAccountStore.open(databasePath, randomBytes(32));
    const created = await firstStore.create("wallet-owner");
    firstStore.close();

    const wrongKeyStore = TaskAccountStore.open(databasePath, randomBytes(32));
    stores.push(wrongKeyStore);

    await expect(wrongKeyStore.signer(created.id)).rejects.toThrow();
  });
});
