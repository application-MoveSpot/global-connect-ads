import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProviderEnum = z.enum(["openai", "anthropic", "xai", "google"]);
export type ProviderName = z.infer<typeof ProviderEnum>;

export type ProviderKey = {
  id: string;
  provider_name: ProviderName;
  key_prefix: string;
  is_active: boolean;
  last_tested_at: string | null;
  created_at: string;
};

// ----- List all provider keys for the current user -----
export const listProviderKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("id, provider_name, key_prefix, is_active, last_tested_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { keys: (data ?? []) as ProviderKey[] };
  });

// ----- Save (upsert) a validated provider key -----
const SaveKeyInput = z.object({
  provider: ProviderEnum,
  keyHash: z.string().length(64),
  keyPrefix: z.string().min(1).max(12),
  lastTestedAt: z.string().datetime().optional(),
});

export const saveProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SaveKeyInput>) => SaveKeyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Deactivate any existing active key for this provider
    await supabase
      .from("user_api_keys")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("provider_name", data.provider)
      .eq("is_active", true);

    const { data: row, error } = await supabase
      .from("user_api_keys")
      .upsert(
        {
          user_id: userId,
          provider_name: data.provider,
          key_hash: data.keyHash,
          key_prefix: data.keyPrefix,
          is_active: true,
          last_tested_at: data.lastTestedAt ?? new Date().toISOString(),
        },
        { onConflict: "user_id,key_hash" },
      )
      .select("id, provider_name, key_prefix, is_active, last_tested_at, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { key: row as ProviderKey };
  });

// ----- Delete a provider key -----
const DeleteKeyInput = z.object({ id: z.string().uuid() });

export const deleteProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof DeleteKeyInput>) => DeleteKeyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
