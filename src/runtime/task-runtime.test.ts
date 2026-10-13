import { afterEach, describe, expect, test } from "vitest";

import { Ledger } from "../ledger/ledger";
import { initializeTaskAuthority } from "./task-runtime";

const openLedgers: Ledger[] = [];

afterEach(() => {
  for (const ledger of openLedgers.splice(0)) ledger.close();
});

describe("initializeTaskAuthority", () => {
  test("creates a 10 USDC manager with 4/3 USDC bounded specialists", () => {
    const ledger = Ledger.memory();
    openLedgers.push(ledger);
    const now = Date.UTC(2026, 9, 13, 6, 0, 0);

    const ids = initializeTaskAuthority(ledger, {
      taskId: "task-1",
      ownerWallet: "owner",
      now,
      mandate: {
        purpose: "Compare a paid research source",
        serviceId: "research-api",
        resourceId: "research-brief",
        maxAmount: 1_000n,
        durationMinutes: 30,
      },
    });

    expect(ledger.availableAmount(ids.manager, now)).toBe(3_000_000n);
    expect(ledger.availableAmount(ids.research, now)).toBe(4_000_000n);
    expect(ledger.availableAmount(ids.analysis, now)).toBe(3_000_000n);
    expect(ledger.taskSnapshot("task-1", now)).toMatchObject({
      task: {
        allocation: 10_000_000n,
        expiresAt: now + 30 * 60_000,
        mandate: {
          purpose: "Compare a paid research source",
          serviceId: "research-api",
          resourceId: "research-brief",
          maxAmount: 1_000n,
        },
      },
      delegations: expect.arrayContaining([
        expect.objectContaining({ id: ids.research, available: 4_000_000n }),
        expect.objectContaining({ id: ids.analysis, available: 3_000_000n }),
      ]),
      payments: [],
    });
  });
});
