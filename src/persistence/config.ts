export type PersistenceEnvironment = Record<string, string | undefined>;

export type PersistenceConfiguration =
  | { kind: "sqlite"; path: string }
  | { kind: "supabase"; url: string; serviceRoleKey: string };

export class PersistenceConfigurationError extends Error {
  readonly code = "DURABLE_STORAGE_NOT_CONFIGURED";

  constructor(message = "Durable server-side storage is not configured") {
    super(message);
    this.name = "PersistenceConfigurationError";
  }
}

export function resolvePersistenceConfiguration(
  environment: PersistenceEnvironment,
): PersistenceConfiguration {
  if (environment.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new PersistenceConfigurationError(
      "Supabase service credentials must never be client-visible",
    );
  }

  const url = environment.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey =
    environment.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (url || serviceRoleKey) {
    if (!url || !serviceRoleKey) throw new PersistenceConfigurationError();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new PersistenceConfigurationError("SUPABASE_URL is invalid");
    }
    if (parsed.protocol !== "https:") {
      throw new PersistenceConfigurationError("SUPABASE_URL must use HTTPS");
    }
    return { kind: "supabase", url, serviceRoleKey };
  }

  if (environment.NODE_ENV === "production") {
    throw new PersistenceConfigurationError();
  }
  return {
    kind: "sqlite",
    path: environment.PACTLET_DATABASE_PATH?.trim() || ":memory:",
  };
}
