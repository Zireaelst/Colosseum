"use client";

import { PactletWalletProvider } from "@pactlet/wallet-kit/react";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  return <PactletWalletProvider>{children}</PactletWalletProvider>;
}
