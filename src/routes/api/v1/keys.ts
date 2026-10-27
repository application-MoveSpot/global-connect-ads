import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, apiJson } from "@/lib/api/api-key-auth.server";

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

export const Route = createFileRoute("/api/v1/keys")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("api_keys")
          .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
          .eq("user_id", auth.userId)
          .order("created_at", { ascending: false });

        if (error) return apiJson({ error: error.message }, 500);
        return apiJson({ keys: data ?? [] });
      },

      POST: async ({ request }: { request: Request }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        let name = "Clé API";
        try {
          const body = (await request.json()) as { name?: string };
          if (typeof body.name === "string" && body.name.trim().length > 0) {
            name = body.name.trim().slice(0, 80);
          }
        } catch {
          // body is optional
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { count } = await supabaseAdmin
          .from("api_keys")
          .select("id", { count: "exact", head: true })
          .eq("user_id", auth.userId)
          .is("revoked_at", null);

        if ((count ?? 0) >= 5) {
          return apiJson({ error: "Maximum 5 active API keys per account." }, 409);
        }

        const rawKey = generateRawKey();
        const keyHash = await sha256hex(rawKey);
        const keyPrefix = rawKey.slice(0, 12);

        const { error } = await supabaseAdmin.from("api_keys").insert({
          user_id: auth.userId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name,
        });

        if (error) return apiJson({ error: error.message }, 500);
        return apiJson({ key: rawKey, prefix: keyPrefix, name }, 201);
      },
    },
  },
});
