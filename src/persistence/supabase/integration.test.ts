import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createPactletSupabaseClient } from "./client";
import { SupabaseLedgerStore } from "./ledger-store";

const configured = Boolean(
  process.env.PACTLET_RUN_SUPABASE_INTEGRATION === "true" &&
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.runIf(configured)("Supabase ledger integration", () => {
  it("serializes competing reservations and replays one purchase only once", async () => {
    const taskId = `integration-${randomUUID()}`;
    const store = new SupabaseLedgerStore(
      createPactletSupabaseClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      ),
    );
    const now = Date.now();
    const researchId = `${taskId}:research`;
    await store.initializeTaskAuthority({
      taskId,
      ownerWallet: "integration-test-owner",
      allocation: 10_000_000n,
      expiresAt: now + 60_000,
      purpose: "Verify atomic Supabase reservation",
      serviceId: "research-api",
      resourceId: "research-brief",
      maxAmount: 3_000_000n,
      managerId: `${taskId}:manager`,
      researchId,
      analysisId: `${taskId}:analysis`,
      specialistExpiresAt: now + 60_000,
      researchAllocation: 4_000_000n,
      analysisAllocation: 3_000_000n,
    });

    const input = {
      delegationId: researchId,
      serviceId: "research-api",
      resourceId: "research-brief",
      amount: 3_000_000n,
      now,
    };
    const [first, second] = await Promise.all([
      store.reservePurchase({ ...input, purchaseRef: "concurrent-a" }),
      store.reservePurchase({ ...input, purchaseRef: "concurrent-b" }),
    ]);
    const accepted = [first, second].filter((result) => result.ok);
    const rejected = [first, second].filter((result) => !result.ok);

    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ code: "BUDGET_EXCEEDED" });

    const winnerRef = first.ok ? "concurrent-a" : "concurrent-b";
    const replay = await store.reservePurchase({
      ...input,
      purchaseRef: winnerRef,
      now: now + 1,
    });
    expect(replay).toMatchObject({ ok: true, replayed: true });
    expect(await store.availableAmount(researchId, now + 1)).toBe(1_000_000n);
  });
});
