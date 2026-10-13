import { describe, expect, test } from "vitest";

import { createAIModel, readAIProviderConfig } from "./model-provider";

describe("readAIProviderConfig", () => {
  test("returns null when the server has no AI key", () => {
    expect(readAIProviderConfig({})).toBeNull();
  });

  test("uses the pinned Groq free-model defaults", () => {
    expect(readAIProviderConfig({ AI_API_KEY: "test-key" })).toEqual({
      apiKey: "test-key",
      baseURL: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-20b",
      provider: "groq-free",
    });
  });

  test("supports an OpenAI-compatible override without changing callers", () => {
    expect(
      readAIProviderConfig({
        AI_API_KEY: "test-key",
        AI_BASE_URL: "https://openrouter.ai/api/v1/",
        AI_MODEL: "openrouter/free",
      }),
    ).toEqual({
      apiKey: "test-key",
      baseURL: "https://openrouter.ai/api/v1",
      model: "openrouter/free",
      provider: "openai-compatible",
    });
  });
});

describe("createAIModel", () => {
  test("constructs a Chat Completions model without making a network call", async () => {
    const config = readAIProviderConfig({ AI_API_KEY: "test-key" });
    if (!config) throw new Error("expected config");

    await expect(createAIModel(config)).resolves.toBeDefined();
  });
});
