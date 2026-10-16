import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  // When LOVABLE_API_KEY is absent, fall back to Google AI API directly
  if (!process.env.LOVABLE_API_KEY && process.env.GOOGLE_AI_API_KEY) {
    return createOpenAICompatible({
      name: "google",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey,
    });
  }
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
