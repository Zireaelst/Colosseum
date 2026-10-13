import { describe, expect, test } from "vitest";

import { validateChildDelegation } from "./delegation";
import type { ChildDelegationProposal, DelegationAuthority } from "./types";

const now = Date.UTC(2026, 9, 12, 12, 0, 0);

function activeParent(
  overrides: Partial<DelegationAuthority> = {},
): DelegationAuthority {
  return {
    allocation: 10_000_000n,
    available: 10_000_000n,
    expiresAt: now + 60_000,
    services: ["research-api"],
    status: "active",
    ...overrides,
  };
}

function childProposal(
  overrides: Partial<ChildDelegationProposal> = {},
): ChildDelegationProposal {
  return {
    allocation: 4_000_000n,
    expiresAt: now + 30_000,
    services: ["research-api"],
    ...overrides,
  };
}

describe("validateChildDelegation", () => {
  test("rejects a child service outside the parent allowlist", () => {
    const decision = validateChildDelegation(
      activeParent(),
      childProposal({ services: ["analysis-api"] }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "SERVICE_NOT_ALLOWED",
    });
  });

  test("rejects a child allocation above the parent's available amount", () => {
    const decision = validateChildDelegation(
      activeParent({ available: 3_000_000n }),
      childProposal({ allocation: 4_000_000n }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "BUDGET_EXCEEDED",
    });
  });

  test("rejects a child expiry after the parent expiry", () => {
    const decision = validateChildDelegation(
      activeParent({ expiresAt: now + 30_000 }),
      childProposal({ expiresAt: now + 30_001 }),
      now,
    );

    expect(decision).toMatchObject({ ok: false, code: "INVALID_EXPIRY" });
  });

  test("rejects delegation from a cancelled parent", () => {
    const decision = validateChildDelegation(
      activeParent({ status: "cancelled" }),
      childProposal(),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "AUTHORITY_CANCELLED",
    });
  });

  test("rejects delegation from an expired parent", () => {
    const decision = validateChildDelegation(
      activeParent({ expiresAt: now }),
      childProposal({ expiresAt: now }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "AUTHORITY_EXPIRED",
    });
  });

  test("rejects a non-positive child allocation", () => {
    const decision = validateChildDelegation(
      activeParent(),
      childProposal({ allocation: 0n }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "INVALID_ALLOCATION",
    });
  });

  test("rejects a child delegation that is already expired", () => {
    const decision = validateChildDelegation(
      activeParent(),
      childProposal({ expiresAt: now }),
      now,
    );

    expect(decision).toMatchObject({ ok: false, code: "INVALID_EXPIRY" });
  });

  test("rejects an empty child service set", () => {
    const decision = validateChildDelegation(
      activeParent(),
      childProposal({ services: [] }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "INVALID_SERVICE_SET",
    });
  });

  test("rejects duplicate child service identifiers", () => {
    const decision = validateChildDelegation(
      activeParent(),
      childProposal({ services: ["research-api", "research-api"] }),
      now,
    );

    expect(decision).toMatchObject({
      ok: false,
      code: "INVALID_SERVICE_SET",
    });
  });

  test("accepts a child that only narrows the parent authority", () => {
    expect(
      validateChildDelegation(activeParent(), childProposal(), now),
    ).toEqual({ ok: true });
  });
});
