import { describe, expect, test, vi } from "vitest";

import { routeSubtask } from "./router";

describe("routeSubtask", () => {
  test("labels the deterministic fallback when Jev is unavailable", async () => {
    await expect(routeSubtask("research the latest source", null)).resolves.toEqual({
      route: "research",
      source: "deterministic-fallback",
      confidence: null,
    });
  });

  test("turns low-confidence Jev output into uncertain", async () => {
    const systemOne = vi.fn().mockResolvedValue({
      model: "jev-1.13",
      answers: {
        route: { choice: "research", confidence: 0.49, probabilities: {} },
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await expect(
      routeSubtask("ambiguous", { systemOne } as never),
    ).resolves.toEqual({
      route: "uncertain",
      source: "jev-1.13",
      confidence: 0.49,
    });
  });

  test("uses Jev only for routing and returns its confident class", async () => {
    const systemOne = vi.fn().mockResolvedValue({
      model: "jev-1.13",
      answers: {
        route: { choice: "analysis", confidence: 0.91, probabilities: {} },
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await expect(routeSubtask("compare the findings", { systemOne } as never)).resolves
      .toMatchObject({ route: "analysis", source: "jev-1.13", confidence: 0.91 });
  });
});
