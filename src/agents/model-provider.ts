import { OpenAIProvider, type Model } from "@openai/agents";

export interface AIProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  provider: "groq-free" | "openai-compatible";
}

type ServerEnvironment = Record<string, string | undefined>;

export function readAIProviderConfig(
  environment: ServerEnvironment = process.env,
): AIProviderConfig | null {
  const apiKey = environment.AI_API_KEY?.trim();
  if (!apiKey) return null;

  const configuredBaseURL = environment.AI_BASE_URL?.trim();
  const baseURL = (
    configuredBaseURL || "https://api.groq.com/openai/v1"
  ).replace(/\/+$/, "");
  return {
    apiKey,
    baseURL,
    model: environment.AI_MODEL?.trim() || "openai/gpt-oss-20b",
    provider:
      baseURL === "https://api.groq.com/openai/v1"
        ? "groq-free"
        : "openai-compatible",
  };
}

export async function createAIModel(config: AIProviderConfig): Promise<Model> {
  const provider = new OpenAIProvider({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    useResponses: false,
    strictFeatureValidation: true,
  });
  return provider.getModel(config.model);
}
