export type WalletEmptyState =
  | { kind: "ready"; title: "Wallets ready" }
  | { kind: "mobile"; title: "Open Pactlet in a wallet browser" }
  | { kind: "missing"; title: "No Solana wallet detected" };

const MOBILE_USER_AGENT = /Android|iPad|iPhone|iPod|Mobile/i;

export function walletEmptyState(input: {
  userAgent: string;
  walletCount: number;
}): WalletEmptyState {
  if (input.walletCount > 0) return { kind: "ready", title: "Wallets ready" };
  if (MOBILE_USER_AGENT.test(input.userAgent)) {
    return { kind: "mobile", title: "Open Pactlet in a wallet browser" };
  }
  return { kind: "missing", title: "No Solana wallet detected" };
}
