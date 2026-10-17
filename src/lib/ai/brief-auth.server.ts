import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";

// Hardcoded fallback — immune to CI/Worker secret corruption. Anon key is public.
const STATIC_SUPABASE_URL = "https://phononlhfyljhhhvlmrm.supabase.co";
const STATIC_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob25vbmxoZnlsamhoaHZsbXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE0NTYsImV4cCI6MjA5Mjg5NzQ1Nn0.egR2cPj_5DoQtZv7Hs-OKt6gwotTDqWjxdG7sgmIBO4";

const sanitizeEnv = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, "").trim();

export type AuthCheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_token" | "token_expired" | "token_invalid" | "config_missing" };

export async function checkBriefRequestAuth(payloadToken?: string): Promise<AuthCheckResult> {
  const supabaseUrl = sanitizeEnv(process.env.SUPABASE_URL || "") || STATIC_SUPABASE_URL;
  const supabasePublishableKey =
    sanitizeEnv(process.env.SUPABASE_PUBLISHABLE_KEY || "") || STATIC_SUPABASE_KEY;

  let headerToken: string | undefined;
  try {
    const authorization = getRequest()?.headers.get("authorization");
    headerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : undefined;
  } catch {
    headerToken = undefined;
  }

  // Try every candidate token: the payload token first (freshly refreshed by
  // the client right before the call), then the header token. A stale or
  // missing header must never block a valid payload token.
  const candidates = [payloadToken?.trim(), headerToken].filter(
    (t, i, arr): t is string => !!t && arr.indexOf(t) === i,
  );
  if (candidates.length === 0) return { ok: false, reason: "no_token" };

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  let lastReason: "token_expired" | "token_invalid" = "token_invalid";
  for (const token of candidates) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) return { ok: true, userId: data.user.id };
      const msg = error?.message?.toLowerCase() ?? "";
      lastReason = msg.includes("expir") ? "token_expired" : "token_invalid";
      console.warn("[brief-auth] token rejected:", error?.status, error?.message);
    } catch (err) {
      console.warn("[brief-auth] getUser failed:", err instanceof Error ? err.message : err);
    }
  }
  return { ok: false, reason: lastReason };
}

// Kept for backwards-compat with functions that haven't been migrated yet.
export async function hasAuthenticatedBriefRequest(): Promise<boolean> {
  const result = await checkBriefRequestAuth();
  return result.ok;
}
