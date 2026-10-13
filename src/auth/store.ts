import { randomBytes } from "node:crypto";

import { WalletNonceStore } from "./wallet-nonce";
import { TaskAccountStore } from "../solana/task-accounts";

const globalNonceStore = globalThis as typeof globalThis & {
  beepleWalletNonceStore?: WalletNonceStore;
  beepleTaskAccountStore?: TaskAccountStore;
  beepleWalletSessions?: Map<string, { address: string; expiresAt: number }>;
};

export const walletNonceStore =
  globalNonceStore.beepleWalletNonceStore ??
  new WalletNonceStore(
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000",
  );

if (process.env.NODE_ENV !== "production") {
  globalNonceStore.beepleWalletNonceStore = walletNonceStore;
}

export const taskAccountStore =
  globalNonceStore.beepleTaskAccountStore ?? new TaskAccountStore();
const walletSessions =
  globalNonceStore.beepleWalletSessions ??
  new Map<string, { address: string; expiresAt: number }>();

if (process.env.NODE_ENV !== "production") {
  globalNonceStore.beepleTaskAccountStore = taskAccountStore;
  globalNonceStore.beepleWalletSessions = walletSessions;
}

export function createWalletSession(address: string, now = Date.now()): string {
  const token = randomBytes(32).toString("base64url");
  walletSessions.set(token, { address, expiresAt: now + 30 * 60_000 });
  return token;
}

export function walletForSession(
  token: string | undefined,
  now = Date.now(),
): string | null {
  if (!token) return null;
  const session = walletSessions.get(token);
  if (!session || session.expiresAt <= now) {
    walletSessions.delete(token);
    return null;
  }
  return session.address;
}
