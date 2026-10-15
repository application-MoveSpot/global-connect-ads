import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";

export type AuthCheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_token" | "token_expired" | "token_invalid" | "config_missing" };

export async function checkBriefRequestAuth(): Promise<AuthCheckResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return { ok: false, reason: "config_missing" };
  }

  const authorization = getRequest().headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, reason: "no_token" };
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return { ok: false, reason: "no_token" };

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  // Use getUser() for a simple server-side validation: one network call to Supabase
  // that handles expiry, signature, and revocation without needing JWK fetches.
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    const reason = msg.includes("expir") ? "token_expired" : "token_invalid";
    return { ok: false, reason };
  }
  if (!data?.user?.id) return { ok: false, reason: "token_invalid" };

  return { ok: true, userId: data.user.id };
}

// Kept for backwards-compat with functions that haven't been migrated yet.
export async function hasAuthenticatedBriefRequest(): Promise<boolean> {
  const result = await checkBriefRequestAuth();
  return result.ok;
}
