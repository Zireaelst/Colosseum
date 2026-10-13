import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

export type SubtaskRoute = "research" | "analysis" | "uncertain";
export interface RoutingDecision {
  route: SubtaskRoute;
  source: "jev-1.13" | "deterministic-fallback";
  confidence: number | null;
}

type JevClient = Pick<TypeSafeClient, "systemOne">;

export function configuredJevClient(): TypeSafeClient | null {
  if (!process.env.TYPESAFE_API_KEY) return null;
  return new TypeSafeClient({
    apiKey: process.env.TYPESAFE_API_KEY,
    defaultModel: "jev-1.13",
    logLevel: "off",
    timeout: 5_000,
    retry: { maxRetries: 0 },
  });
}

export async function routeSubtask(
  input: string,
  client: JevClient | null = configuredJevClient(),
): Promise<RoutingDecision> {
  if (!client) {
    const normalized = input.toLowerCase();
    const route: SubtaskRoute = /research|find|source|lookup/.test(normalized)
      ? "research"
      : /analy|compare|evaluate|synthesi/.test(normalized)
        ? "analysis"
        : "uncertain";
    return { route, source: "deterministic-fallback", confidence: null };
  }

  const response = await client.systemOne({
    model: "jev-1.13",
    state: { subtask: input },
    questions: {
      route: choice("Route this subtask by intent only.", {
        research: "Find or retrieve external facts and sources.",
        analysis: "Compare, reason over, or synthesize supplied facts.",
        uncertain: "The intent is ambiguous or needs user clarification.",
      }),
    },
  });
  const answer = response.answers.route;
  return {
    route: answer.confidence >= 0.6 ? answer.choice : "uncertain",
    source: "jev-1.13",
    confidence: answer.confidence,
  };
}
