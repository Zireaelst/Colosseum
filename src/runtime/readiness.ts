export interface RuntimeReadiness {
  ai: boolean;
  jev: boolean;
  merchant: boolean;
  rpc: boolean;
  storage: boolean;
}

export function readRuntimeReadiness(
  environment: Record<string, string | undefined> = process.env,
): RuntimeReadiness {
  return {
    ai: Boolean(environment.AI_API_KEY?.trim()),
    jev: Boolean(environment.TYPESAFE_API_KEY?.trim()),
    merchant: Boolean(environment.X402_MERCHANT_PAY_TO?.trim()),
    rpc: Boolean(environment.SOLANA_DEVNET_RPC_URL?.trim()),
    storage: Boolean(
      environment.SUPABASE_URL?.trim() &&
        environment.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
  };
}
