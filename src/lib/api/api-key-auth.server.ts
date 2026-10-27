// Validates a Bearer API key from the Authorization header.
// Returns the user_id on success, or a Response error to return directly.

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticateApiKey(
  request: Request,
): Promise<{ userId: string } | Response> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawKey = auth.slice(7).trim();
  if (!rawKey.startsWith("ms_")) {
    return new Response(JSON.stringify({ error: "Invalid API key format" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hash = await sha256hex(rawKey);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("user_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!data) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (data.revoked_at) {
    return new Response(JSON.stringify({ error: "API key revoked" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update last_used_at (fire & forget)
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash);

  return { userId: data.user_id as string };
}

export function apiJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
