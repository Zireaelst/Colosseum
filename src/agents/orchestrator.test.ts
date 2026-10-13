import type { Model } from "@openai/agents";
import { describe, expect, test, vi } from "vitest";

import { runPactletManager } from "./orchestrator";

const groqConfig = {
  apiKey: "test-key",
  baseURL: "https://api.groq.com/openai/v1",
  model: "openai/gpt-oss-20b",
  provider: "groq-free" as const,
};

describe("runPactletManager", () => {
  test("uses a labeled non-paying fallback when no AI key is configured", async () => {
    const purchase = vi.fn();

    const result = await runPactletManager(
      { prompt: "research this", purchase },
      {
        route: vi.fn().mockResolvedValue({
          route: "research",
          source: "deterministic-fallback",
          confidence: null,
        }),
        providerConfig: null,
      },
    );

    expect(result).toEqual({
      routing: {
        route: "research",
        source: "deterministic-fallback",
        confidence: null,
      },
      executionMode: "demo-fallback",
      provider: null,
      model: null,
      output: "AI credentials are not configured. No payment was attempted.",
    });
    expect(purchase).not.toHaveBeenCalled();
  });

  test("runs the manager with the configured OpenAI-compatible model", async () => {
    const model = { getResponse: vi.fn(), getStreamedResponse: vi.fn() } as unknown as Model;
    const executeAgent = vi.fn().mockResolvedValue("manager result");

    const result = await runPactletManager(
      { prompt: "analyze this", purchase: vi.fn() },
      {
        route: vi.fn().mockResolvedValue({
          route: "analysis",
          source: "jev-1.13",
          confidence: 0.92,
        }),
        providerConfig: groqConfig,
        createModel: vi.fn().mockResolvedValue(model),
        executeAgent,
      },
    );

    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "pactlet manager", model }),
      "analyze this",
    );
    expect(result).toMatchObject({
      executionMode: "live",
      provider: "groq-free",
      model: "openai/gpt-oss-20b",
      output: "manager result",
    });
  });

  test("an uncertain route stops before model execution or purchase", async () => {
    const createModel = vi.fn();
    const executeAgent = vi.fn();
    const purchase = vi.fn();

    const result = await runPactletManager(
      { prompt: "unclear", purchase },
      {
        route: vi.fn().mockResolvedValue({
          route: "uncertain",
          source: "jev-1.13",
          confidence: 0.4,
        }),
        providerConfig: groqConfig,
        createModel,
        executeAgent,
      },
    );

    expect(result.executionMode).toBe("policy-stop");
    expect(createModel).not.toHaveBeenCalled();
    expect(executeAgent).not.toHaveBeenCalled();
    expect(purchase).not.toHaveBeenCalled();
  });
});
