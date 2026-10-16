import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import type {
  SupabaseTaskAccountGateway,
  TaskAccountDatabaseRow,
} from "./client";
import { SupabaseTaskAccountStore } from "./task-account-store";

class MemoryGateway implements SupabaseTaskAccountGateway {
  readonly rows = new Map<string, TaskAccountDatabaseRow>();

  async insertTaskAccount(row: TaskAccountDatabaseRow) {
    this.rows.set(row.id, row);
  }

  async findTaskAccount(id: string) {
    return this.rows.get(id) ?? null;
  }

  async listTaskAccounts(ownerWallet: string, offset: number) {
    return [...this.rows.values()].filter(row => row.owner_wallet === ownerWallet).reverse().slice(offset, offset + 21).map(row => ({ id: row.id, payment_address: row.payment_address, funding_signature: row.funding_signature }));
  }

  async markTaskFunded(id: string, signature: string) {
    const row = this.rows.get(id);
    if (!row || (row.funding_signature && row.funding_signature !== signature)) {
      return false;
    }
    this.rows.set(id, { ...row, funding_signature: signature });
    return true;
  }
}

describe("SupabaseTaskAccountStore", () => {
  it("returns only public task history for its owner", async () => {
    const gateway = new MemoryGateway();
    const store = new SupabaseTaskAccountStore(gateway, randomBytes(32));
    const task = await store.create("owner-a");
    await store.create("owner-b");
    expect(await store.listForOwner("owner-a")).toEqual([{ id: task.id, paymentAddress: task.paymentAddress }]);
  });
  it("stores only encrypted signer material and reconstructs the same signer", async () => {
    const gateway = new MemoryGateway();
    const store = new SupabaseTaskAccountStore(gateway, randomBytes(32));

    const account = await store.create("owner-wallet");
    const row = gateway.rows.get(account.id);
    const signer = await store.signer(account.id);

    expect(row).toMatchObject({
      id: account.id,
      owner_wallet: "owner-wallet",
      payment_address: account.paymentAddress,
      signer_algorithm: "aes-256-gcm",
    });
    expect(row?.signer_ciphertext).not.toBe("");
    expect(Object.keys(row ?? {})).not.toContain("seed");
    expect(signer.address).toBe(account.paymentAddress);
  });

  it("rejects a conflicting funding signature", async () => {
    const gateway = new MemoryGateway();
    const store = new SupabaseTaskAccountStore(gateway, randomBytes(32));
    const account = await store.create("owner-wallet");

    await store.markFunded(account.id, "signature-1");

    await expect(
      store.markFunded(account.id, "signature-2"),
    ).rejects.toThrow("conflicting funding signature");
  });

  it("accepts bigint columns returned as safe JavaScript numbers", async () => {
    const gateway = new MemoryGateway();
    const store = new SupabaseTaskAccountStore(gateway, randomBytes(32));
    const account = await store.create("owner-wallet");
    const row = gateway.rows.get(account.id);
    if (!row) throw new Error("Expected task account row");

    gateway.rows.set(account.id, {
      ...row,
      allocation_units: 10_000_000 as unknown as string,
    });

    await expect(store.task(account.id)).resolves.toMatchObject({
      id: account.id,
      allocation: "10000000",
    });
  });
});
