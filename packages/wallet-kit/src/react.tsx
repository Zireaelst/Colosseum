"use client";

import { ClientProvider } from "@solana/react";
import type { ReactNode } from "react";

import { walletClient } from "./index";

export {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWalletStatus,
  useWallets,
} from "@solana/kit-plugin-wallet/react";

export function PactletWalletProvider({ children }: { children: ReactNode }) {
  return <ClientProvider client={walletClient}>{children}</ClientProvider>;
}
