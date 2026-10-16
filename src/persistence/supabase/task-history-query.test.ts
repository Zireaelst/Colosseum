import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseGateway } from "./client";
import { DEVNET_USDC_MINT, SOLANA_DEVNET_NETWORK } from "../../policy/payment-terms";

describe("Supabase task history query", () => {
  it("filters by owner and devnet at the database and selects no signer columns", async () => {
    let queried: URL | undefined;
    const client = createClient("https://example.supabase.co", "test-server-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async input => { queried = new URL(String(input)); return Response.json([{ id: "task", payment_address: "payer", funding_signature: null }]); } },
    });
    const rows = await new SupabaseGateway(client).listTaskAccounts("owner-a", 20);
    expect(rows).toEqual([{ id: "task", payment_address: "payer", funding_signature: null }]);
    expect(queried?.searchParams.get("select")).toBe("id,payment_address,funding_signature");
    expect(queried?.searchParams.get("owner_wallet")).toBe("eq.owner-a");
    expect(queried?.searchParams.get("network")).toBe(`eq.${SOLANA_DEVNET_NETWORK}`);
    expect(queried?.searchParams.get("mint")).toBe(`eq.${DEVNET_USDC_MINT}`);
    expect(queried?.searchParams.get("offset")).toBe("20");
    expect(queried?.searchParams.get("limit")).toBe("21");
    expect(queried?.searchParams.get("order")).toBe("created_at_ms.desc,id.desc");
  });
});
