import { Ledger } from "../ledger/ledger";

const runtimeGlobal = globalThis as typeof globalThis & {
  beepleLedger?: Ledger;
};

export const ledger =
  runtimeGlobal.beepleLedger ??
  (process.env.BEEPLE_DATABASE_PATH
    ? Ledger.open(process.env.BEEPLE_DATABASE_PATH)
    : Ledger.memory());

if (process.env.NODE_ENV !== "production") runtimeGlobal.beepleLedger = ledger;
