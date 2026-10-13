import { describe, expect, it } from "vitest";

import {
  PersistenceConfigurationError,
  resolvePersistenceConfiguration,
} from "./config";

describe("resolvePersistenceConfiguration", () => {
  it("selects Supabase only when both server-side credentials are present", () => {
    expect(
      resolvePersistenceConfiguration({
        NODE_ENV: "production",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      }),
    ).toEqual({
      kind: "supabase",
      url: "https://example.supabase.co",
      serviceRoleKey: "server-secret",
    });
  });

  it("fails closed on partial Supabase configuration", () => {
    expect(() =>
      resolvePersistenceConfiguration({
        NODE_ENV: "production",
        SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(PersistenceConfigurationError);
  });

  it("fails closed in production when durable storage is missing", () => {
    expect(() =>
      resolvePersistenceConfiguration({ NODE_ENV: "production" }),
    ).toThrow(PersistenceConfigurationError);
  });

  it("uses SQLite only for local and test environments", () => {
    expect(
      resolvePersistenceConfiguration({
        NODE_ENV: "test",
        PACTLET_DATABASE_PATH: "./pactlet.test.db",
      }),
    ).toEqual({ kind: "sqlite", path: "./pactlet.test.db" });
  });

  it("rejects client-visible Supabase secrets", () => {
    expect(() =>
      resolvePersistenceConfiguration({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "leaked-secret",
      }),
    ).toThrow(PersistenceConfigurationError);
  });
});
