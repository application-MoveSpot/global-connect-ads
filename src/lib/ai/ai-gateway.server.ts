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

function detectKeyProvider(apiKey: string): "google" | "openai" | "mistral" {
  if (apiKey.startsWith("AIzaSy")) return "google";
  if (apiKey.startsWith("sk-")) return "openai";
  return "mistral";
}

/** Auto-detect provider and create the right client for a user-supplied API key. */
export function createUserKeyProvider(apiKey: string) {
  const kind = detectKeyProvider(apiKey);
  if (kind === "google") {
    return createOpenAICompatible({
      name: "google",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey,
    });
  }
  if (kind === "openai") {
    return createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey,
    });
  }
  // Mistral
  return createOpenAICompatible({
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKey,
  });
}

/** Return the best available model ID for a user-supplied API key. */
export function getUserKeyModel(apiKey: string): string {
  const kind = detectKeyProvider(apiKey);
  if (kind === "google") return "gemini-2.5-flash";
  if (kind === "openai") return "gpt-4o-mini";
  return "mistral-small-latest";
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
