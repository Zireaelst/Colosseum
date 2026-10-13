import { Agent, Runner, tool, type Model } from "@openai/agents";
import { z } from "zod";

import type { PurchaseResult } from "../payments/purchase-service";
import {
  createAIModel,
  readAIProviderConfig,
  type AIProviderConfig,
} from "./model-provider";
import { routeSubtask, type RoutingDecision } from "./router";

export interface ManagerRunResult {
  routing: RoutingDecision;
  executionMode: "live" | "demo-fallback" | "policy-stop" | "provider-error";
  provider: AIProviderConfig["provider"] | null;
  model: string | null;
  output: string;
}

interface OrchestratorDependencies {
  route(prompt: string): Promise<RoutingDecision>;
  providerConfig: AIProviderConfig | null;
  createModel(config: AIProviderConfig): Promise<Model>;
  executeAgent(agent: Agent, prompt: string): Promise<string>;
}

async function defaultExecuteAgent(agent: Agent, prompt: string): Promise<string> {
  const runner = new Runner({
    tracingDisabled: true,
    traceIncludeSensitiveData: false,
    modelSettings: {
      parallelToolCalls: false,
      maxTokens: 1_200,
    },
  });
  const result = await runner.run(agent, prompt, { maxTurns: 6 });
  return result.finalOutput ?? "";
}

function dependencies(
  overrides: Partial<OrchestratorDependencies> = {},
): OrchestratorDependencies {
  return {
    route: routeSubtask,
    providerConfig: readAIProviderConfig(),
    createModel: createAIModel,
    executeAgent: defaultExecuteAgent,
    ...overrides,
  };
}

export function buildBeepleAgentGraph(input: {
  model: Model;
  routing: RoutingDecision & { route: "research" | "analysis" };
  purchase(purchaseKey: string): Promise<PurchaseResult>;
}) {
  const purchaseResearch = tool({
    name: "purchase_research",
    description:
      "Purchase the one allowlisted beeple research service. Runtime policy supplies identity, endpoint, service, amount, and signer.",
    parameters: z.object({ purchaseKey: z.string().min(1).max(100) }),
    execute: async ({ purchaseKey }) =>
      JSON.stringify(await input.purchase(purchaseKey), (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
  });
  const research = new Agent({
    name: "Research specialist",
    model: input.model,
    instructions:
      "Handle research subtasks. For this demo, call purchase_research exactly once when the prompt asks for the paid demo source. Never invent a payment result.",
    tools: [purchaseResearch],
  });
  const analysis = new Agent({
    name: "Analysis specialist",
    model: input.model,
    instructions:
      "Analyze supplied information. You have no payment tool and must not claim to buy data.",
  });
  const specialist = input.routing.route === "research" ? research : analysis;
  const manager = new Agent({
    name: "beeple manager",
    model: input.model,
    instructions:
      `Own the final answer. Routing selected ${input.routing.route}. Call the available specialist once, then distinguish evidence, payment status, and limitations.`,
    tools: [
      specialist.asTool({
        toolName: `${input.routing.route}_specialist`,
        toolDescription: `Run the bounded ${input.routing.route} specialist.`,
      }),
    ],
  });
  return { manager, research, analysis };
}

export async function runBeepleManager(
  input: {
    prompt: string;
    purchase(purchaseKey: string): Promise<PurchaseResult>;
  },
  overrides: Partial<OrchestratorDependencies> = {},
): Promise<ManagerRunResult> {
  const services = dependencies(overrides);
  const routing = await services.route(input.prompt);
  if (routing.route === "uncertain") {
    return {
      routing,
      executionMode: "policy-stop",
      provider: services.providerConfig?.provider ?? null,
      model: services.providerConfig?.model ?? null,
      output:
        "The subtask is uncertain. No payment was attempted; clarify or explicitly approve a route.",
    };
  }
  if (!services.providerConfig) {
    return {
      routing,
      executionMode: "demo-fallback",
      provider: null,
      model: null,
      output: "AI credentials are not configured. No payment was attempted.",
    };
  }

  try {
    const model = await services.createModel(services.providerConfig);
    const { manager } = buildBeepleAgentGraph({
      model,
      routing: { ...routing, route: routing.route },
      purchase: input.purchase,
    });
    return {
      routing,
      executionMode: "live",
      provider: services.providerConfig.provider,
      model: services.providerConfig.model,
      output: await services.executeAgent(manager, input.prompt),
    };
  } catch {
    return {
      routing,
      executionMode: "provider-error",
      provider: services.providerConfig.provider,
      model: services.providerConfig.model,
      output: "The AI provider request failed. No automatic retry was performed.",
    };
  }
}
