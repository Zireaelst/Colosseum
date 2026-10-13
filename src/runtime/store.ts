import { Ledger } from "../ledger/ledger";

const runtimeGlobal = globalThis as typeof globalThis & {
  pactletLedger?: Ledger;
};

export const ledger =
  runtimeGlobal.pactletLedger ??
  (process.env.PACTLET_DATABASE_PATH
    ? Ledger.open(process.env.PACTLET_DATABASE_PATH)
    : Ledger.memory());

if (process.env.NODE_ENV !== "production") runtimeGlobal.pactletLedger = ledger;
