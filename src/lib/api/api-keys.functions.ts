import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ms_${hex}`;
}

export const generateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string }) =>
    z.object({ name: z.string().min(1).max(80).default("Clé API") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // Max 5 active keys per user
    const { count } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if ((count ?? 0) >= 5) {
      return { error: "Maximum 5 clés actives par compte." } as const;
    }

    const rawKey = generateRawKey();
    const keyHash = await sha256hex(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const { error } = await supabase.from("api_keys").insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: data.name,
    });

    if (error) return { error: error.message } as const;

    // Return the raw key ONCE — it cannot be retrieved afterwards
    return { ok: true as const, key: rawKey, prefix: keyPrefix };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { keys: data ?? [] };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { keyId: string }) => z.object({ keyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId)
      .eq("user_id", userId);
    if (error) return { error: error.message } as const;
    return { ok: true as const };
  });
