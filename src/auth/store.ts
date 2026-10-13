import { TaskAccountStore } from "../solana/task-accounts";
import { parseSignerMasterKey } from "../solana/task-signer-vault";
import { createPactletSupabaseClient, SupabaseGateway } from "../persistence/supabase/client";
import { SupabaseTaskAccountStore } from "../persistence/supabase/task-account-store";
import {
  createSessionToken,
  issueWalletChallenge as issueSignedWalletChallenge,
  verifyWalletChallenge as verifySignedWalletChallenge,
  walletFromSessionToken,
  type WalletVerificationResult,
} from "./signed-wallet-auth";

const globalNonceStore = globalThis as typeof globalThis & {
  pactletTaskAccountStore?: TaskAccountStore | SupabaseTaskAccountStore;
};

type AuthEnvironment = Record<string, string | undefined>;

export class TaskSignerConfigurationError extends Error {
  readonly code = "TASK_SIGNER_NOT_CONFIGURED";

  constructor() {
    super("Persistent task signer storage is not configured");
    this.name = "TaskSignerConfigurationError";
  }
}

function taskAccountConfiguration(environment: AuthEnvironment): {
  databasePath?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  masterKey: Uint8Array;
} {
  const databasePath = environment.PACTLET_DATABASE_PATH?.trim() ?? "";
  const supabaseUrl = environment.SUPABASE_URL?.trim() ?? "";
  const supabaseServiceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const encodedMasterKey =
    environment.PACTLET_SIGNER_MASTER_KEY?.trim() ?? "";
  if ((!databasePath && (!supabaseUrl || !supabaseServiceRoleKey)) || !encodedMasterKey) {
    throw new TaskSignerConfigurationError();
  }
  try {
    return {
      ...(supabaseUrl && supabaseServiceRoleKey
        ? { supabaseUrl, supabaseServiceRoleKey }
        : { databasePath }),
      masterKey: parseSignerMasterKey(encodedMasterKey),
    };
  } catch {
    throw new TaskSignerConfigurationError();
  }
}

export function assertTaskAccountStoreConfigured(
  environment: AuthEnvironment = process.env,
): void {
  taskAccountConfiguration(environment);
}

function createTaskAccountStore(
  environment: AuthEnvironment,
): TaskAccountStore | SupabaseTaskAccountStore {
  try {
    const configuration = taskAccountConfiguration(environment);
    if (configuration.supabaseUrl && configuration.supabaseServiceRoleKey) {
      return new SupabaseTaskAccountStore(
        new SupabaseGateway(
          createPactletSupabaseClient(
            configuration.supabaseUrl,
            configuration.supabaseServiceRoleKey,
          ),
        ),
        configuration.masterKey,
      );
    }
    return TaskAccountStore.open(
      configuration.databasePath as string,
      configuration.masterKey,
    );
  } catch (error) {
    if (error instanceof TaskSignerConfigurationError) {
      return new TaskAccountStore();
    }
    throw error;
  }
}

export const taskAccountStore =
  globalNonceStore.pactletTaskAccountStore ?? createTaskAccountStore(process.env);

if (process.env.NODE_ENV !== "production") {
  globalNonceStore.pactletTaskAccountStore = taskAccountStore;
}

export class AuthConfigurationError extends Error {
  readonly code = "AUTH_NOT_CONFIGURED";

  constructor() {
    super("Wallet authentication is not configured");
    this.name = "AuthConfigurationError";
  }
}

function authConfiguration(environment: AuthEnvironment): {
  origin: string;
  secret: string;
} {
  const origin =
    environment.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";
  const secret = environment.PACTLET_SESSION_SECRET?.trim() ?? "";
  if (secret.length < 32) throw new AuthConfigurationError();
  return { origin, secret };
}

export function issueWalletChallenge(
  walletAddress: string,
  now = Date.now(),
  environment: AuthEnvironment = process.env,
) {
  const { origin, secret } = authConfiguration(environment);
  return issueSignedWalletChallenge({
    address: walletAddress,
    origin,
    secret,
    now,
  });
}

export function verifyWalletChallenge(
  input: {
    address: string;
    message: string;
    signature: string;
    now?: number;
  },
  environment: AuthEnvironment = process.env,
): WalletVerificationResult {
  const { origin, secret } = authConfiguration(environment);
  return verifySignedWalletChallenge({ ...input, origin, secret });
}

export function createWalletSession(
  address: string,
  now = Date.now(),
  environment: AuthEnvironment = process.env,
): string {
  const { secret } = authConfiguration(environment);
  return createSessionToken({ address, secret, now });
}

export function walletForSession(
  token: string | undefined,
  now = Date.now(),
  environment: AuthEnvironment = process.env,
): string | null {
  try {
    const { secret } = authConfiguration(environment);
    return walletFromSessionToken({ token, secret, now });
  } catch (error) {
    if (error instanceof AuthConfigurationError) return null;
    throw error;
  }
}
