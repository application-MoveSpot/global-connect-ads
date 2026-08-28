import { supabase } from "@/integrations/supabase/client";

// Stable session identifier for this browser tab
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export async function track(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    // analytics_events is not in the generated Supabase types (append-only log table)
    await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
      .from("analytics_events")
      .insert({
        event,
        user_id: data.user?.id ?? null,
        session_id: sessionId,
        properties: properties ?? null,
      });
  } catch {
    // fire-and-forget — never block the happy path
  }
}
