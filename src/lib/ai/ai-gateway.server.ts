import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function useGoogleAi(): boolean {
  return !process.env.LOVABLE_API_KEY && !!process.env.GOOGLE_AI_API_KEY;
}

/** Direct Google AI (Gemini) provider — for user-supplied API keys. */
export function createGoogleAiDirectProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
}

export function createLovableAiGatewayProvider(apiKey: string) {
  // When LOVABLE_API_KEY is absent, fall back to Google AI API directly
  if (useGoogleAi()) {
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

export function getAiGatewayFetchConfig(apiKey: string): {
  url: string;
  headers: Record<string, string>;
} {
  if (useGoogleAi()) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    };
  }
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  };
}
