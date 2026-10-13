import { address } from "@solana/kit";

import { SOLANA_DEVNET_NETWORK } from "../src/policy/payment-terms";

export interface MerchantConfig {
  payTo: string;
  facilitatorUrl: string;
  host: "127.0.0.1" | "0.0.0.0" | "::1";
  port: number;
}

function facilitatorUrl(value: string | undefined): string {
  const raw = value?.trim() || "https://x402.org/facilitator";
  const parsed = new URL(raw);
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
    parsed.hostname,
  );
  if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new Error("X402_FACILITATOR_URL must use HTTPS outside loopback");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("X402_FACILITATOR_URL must not contain credentials, query, or hash");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function readMerchantConfig(
  environment: Record<string, string | undefined> = process.env,
): MerchantConfig {
  const rawPayTo = environment.X402_MERCHANT_PAY_TO?.trim();
  if (!rawPayTo) throw new Error("X402_MERCHANT_PAY_TO is required");

  let payTo: string;
  try {
    payTo = address(rawPayTo);
  } catch {
    throw new Error("X402_MERCHANT_PAY_TO must be a valid Solana address");
  }

  const rawHost = environment.X402_MERCHANT_HOST?.trim() || "127.0.0.1";
  if (!["127.0.0.1", "0.0.0.0", "::1"].includes(rawHost)) {
    throw new Error("X402_MERCHANT_HOST must be an explicit bind host");
  }

  const rawPort = environment.PORT?.trim() ||
    environment.X402_MERCHANT_PORT?.trim() ||
    "4021";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Merchant port must be an integer between 1 and 65535");
  }

  return {
    payTo,
    facilitatorUrl: facilitatorUrl(environment.X402_FACILITATOR_URL),
    host: rawHost as MerchantConfig["host"],
    port,
  };
}

export async function assertFacilitatorSupport(
  baseUrl: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImplementation(`${baseUrl}/supported`, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Facilitator /supported returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    kinds?: Array<{
      x402Version?: number;
      scheme?: string;
      network?: string;
    }>;
  };
  const supported = payload.kinds?.some(
    (kind) =>
      kind.x402Version === 2 &&
      kind.scheme === "exact" &&
      kind.network === SOLANA_DEVNET_NETWORK,
  );
  if (!supported) {
    throw new Error("Facilitator does not advertise x402 V2 Solana devnet exact");
  }
}
