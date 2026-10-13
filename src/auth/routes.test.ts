import { generateKeyPairSync } from "node:crypto";

import { getAddressDecoder } from "@solana/kit";
import { afterEach, describe, expect, test, vi } from "vitest";

import { POST as issueNonce } from "../../app/api/auth/nonce/route";

function walletAddress(): string {
  const { publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  return getAddressDecoder().decode(publicDer.subarray(-32));
}

afterEach(() => vi.unstubAllEnvs());

describe("wallet auth routes", () => {
  test("returns a safe 503 when signed authentication is not configured", async () => {
    vi.stubEnv("PACTLET_SESSION_SECRET", "");
    const response = await issueNonce(
      new Request("https://pactlet.example/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: walletAddress() }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "AUTH_NOT_CONFIGURED",
    });
  });
});
