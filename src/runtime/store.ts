import { Ledger } from "../ledger/ledger";
import { resolvePersistenceConfiguration, type PersistenceEnvironment } from "../persistence/config";
import { createPactletSupabaseClient } from "../persistence/supabase/client";
import { SupabaseLedgerStore } from "../persistence/supabase/ledger-store";

export type RuntimeLedger = Ledger | SupabaseLedgerStore;

export function createLedgerStore(
  environment: PersistenceEnvironment,
): RuntimeLedger {
  const configuration = resolvePersistenceConfiguration(environment);
  if (configuration.kind === "sqlite") {
    return configuration.path === ":memory:"
      ? Ledger.memory()
      : Ledger.open(configuration.path);
  }
  return new SupabaseLedgerStore(
    createPactletSupabaseClient(
      configuration.url,
      configuration.serviceRoleKey,
    ),
  );
}

const runtimeGlobal = globalThis as typeof globalThis & {
  pactletLedger?: RuntimeLedger;
};

export const ledger =
  runtimeGlobal.pactletLedger ??
  createLedgerStore(process.env);

if (process.env.NODE_ENV !== "production") runtimeGlobal.pactletLedger = ledger;
