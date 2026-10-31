import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "openai" | "anthropic" | "xai" | "google";

type TestResult = {
  ok: boolean;
  keyHash: string;
  keyPrefix: string;
  status: "valid" | "invalid_key" | "rate_limited" | "error";
  error?: string;
};

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function testOpenAI(key: string): Promise<{ ok: boolean; status: TestResult["status"]; error?: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 1,
    }),
  });
  if (res.status === 401 || res.status === 403) return { ok: false, status: "invalid_key", error: "Clé invalide" };
  if (res.status === 429) return { ok: true, status: "rate_limited" };
  if (res.ok) return { ok: true, status: "valid" };
  const body = await res.json().catch(() => ({}));
  return { ok: false, status: "error", error: (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}` };
}

async function testAnthropic(key: string): Promise<{ ok: boolean; status: TestResult["status"]; error?: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  if (res.status === 401 || res.status === 403) return { ok: false, status: "invalid_key", error: "Clé invalide" };
  if (res.status === 429) return { ok: true, status: "rate_limited" };
  if (res.ok) return { ok: true, status: "valid" };
  const body = await res.json().catch(() => ({}));
  return { ok: false, status: "error", error: (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}` };
}

async function testXAI(key: string): Promise<{ ok: boolean; status: TestResult["status"]; error?: string }> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 1,
    }),
  });
  if (res.status === 401 || res.status === 403) return { ok: false, status: "invalid_key", error: "Clé invalide" };
  if (res.status === 429) return { ok: true, status: "rate_limited" };
  if (res.ok) return { ok: true, status: "valid" };
  const body = await res.json().catch(() => ({}));
  return { ok: false, status: "error", error: (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}` };
}

async function testGoogle(key: string): Promise<{ ok: boolean; status: TestResult["status"]; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: { message?: string } })?.error?.message ?? "";
    if (msg.includes("API_KEY_INVALID") || msg.includes("INVALID_ARGUMENT")) {
      return { ok: false, status: "invalid_key", error: "Clé invalide" };
    }
  }
  if (res.status === 401 || res.status === 403) return { ok: false, status: "invalid_key", error: "Clé invalide" };
  if (res.status === 429) return { ok: true, status: "rate_limited" };
  if (res.ok) return { ok: true, status: "valid" };
  const body = await res.json().catch(() => ({}));
  return { ok: false, status: "error", error: (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}` };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, key } = (await req.json()) as { provider: Provider; key: string };

    if (!provider || !key || !["openai", "anthropic", "xai", "google"].includes(provider)) {
      return new Response(JSON.stringify({ error: "provider et key requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedKey = key.trim();
    const keyHash = await sha256Hex(trimmedKey);
    const keyPrefix = trimmedKey.slice(0, 8);

    let testResult: { ok: boolean; status: TestResult["status"]; error?: string };

    switch (provider) {
      case "openai":
        testResult = await testOpenAI(trimmedKey);
        break;
      case "anthropic":
        testResult = await testAnthropic(trimmedKey);
        break;
      case "xai":
        testResult = await testXAI(trimmedKey);
        break;
      case "google":
        testResult = await testGoogle(trimmedKey);
        break;
      default:
        testResult = { ok: false, status: "error", error: "Provider inconnu" };
    }

    const result: TestResult = {
      ok: testResult.ok,
      keyHash,
      keyPrefix,
      status: testResult.status,
      error: testResult.error,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
