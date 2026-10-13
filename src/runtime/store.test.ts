import { describe, expect, it } from "vitest";

import { Ledger } from "../ledger/ledger";
import { SupabaseLedgerStore } from "../persistence/supabase/ledger-store";
import { createLedgerStore } from "./store";

describe("createLedgerStore", () => {
  it("selects durable Supabase storage when server credentials exist", () => {
    const store = createLedgerStore({
      NODE_ENV: "production",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
    });

    expect(store).toBeInstanceOf(SupabaseLedgerStore);
  });

  it("keeps SQLite for tests", () => {
    const store = createLedgerStore({ NODE_ENV: "test" });
    expect(store).toBeInstanceOf(Ledger);
    (store as Ledger).close();
  });
});
