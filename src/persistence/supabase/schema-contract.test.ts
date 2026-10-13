import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationDirectory = join(process.cwd(), "supabase/migrations");
const migration = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(migrationDirectory, name), "utf8"))
  .join("\n")
  .toLowerCase();

describe("Pactlet Supabase migration", () => {
  it("creates every separated ledger concept", () => {
    for (const table of [
      "tasks",
      "task_mandates",
      "task_accounts",
      "delegations",
      "delegation_services",
      "payment_requests",
      "reservations",
      "settlements",
      "events",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
    }
  });

  it("defines atomic reservation and authority initialization functions", () => {
    expect(migration).toContain("function public.reserve_purchase");
    expect(migration).toContain("function public.initialize_task_authority");
    expect(migration).toContain("function public.mark_task_funded");
    for (const transition of [
      "available_amount",
      "cancel_delegation",
      "mark_settlement_pending",
      "record_pending_signature",
      "fail_payment",
      "confirm_settlement",
    ]) {
      expect(migration).toContain(`function public.${transition}`);
    }
    expect(migration).toContain("for update");
    expect(migration).toContain("security invoker");
  });

  it("locks down every table with RLS and service-role-only grants", () => {
    for (const table of [
      "tasks",
      "task_mandates",
      "task_accounts",
      "delegations",
      "delegation_services",
      "payment_requests",
      "reservations",
      "settlements",
      "events",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    expect(migration).toContain("revoke all on public.tasks");
    expect(migration).not.toContain("revoke all on all tables in schema public");
    expect(migration).toContain("grant select, insert, update");
    expect(migration).not.toMatch(/grant\s+.+\s+to\s+(anon|authenticated)/);
  });

  it("indexes foreign keys and enforces purchase idempotency", () => {
    expect(migration).toContain("unique (delegation_id, purchase_ref)");
    expect(migration).toContain("delegations_task_id_idx");
    expect(migration).toContain("delegations_parent_id_idx");
    expect(migration).toContain("payment_requests_delegation_id_idx");
    expect(migration).toContain("reservations_delegation_id_idx");
    expect(migration).toContain("events_task_id_idx");
  });
});
