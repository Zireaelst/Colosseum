import { describe, expect, it } from "vitest";

import { walletEmptyState } from "./wallet-ui-state";

describe("wallet empty state", () => {
  it("reports ready when a devnet Wallet Standard wallet is discovered", () => {
    expect(walletEmptyState({ userAgent: "Mozilla/5.0", walletCount: 1 })).toEqual({
      kind: "ready",
      title: "Wallets ready",
    });
  });

  it("guides mobile users to a wallet browser", () => {
    expect(
      walletEmptyState({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        walletCount: 0,
      }),
    ).toMatchObject({ kind: "mobile", title: "Open Pactlet in a wallet browser" });
  });

  it("guides desktop users to install or unlock a wallet", () => {
    expect(
      walletEmptyState({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", walletCount: 0 }),
    ).toMatchObject({ kind: "missing", title: "No Solana wallet detected" });
  });
});
