import { supabase } from "@/integrations/supabase/client";

// Stable session identifier for this browser tab
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export async function track(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event,
      user_id: data.user?.id ?? null,
      session_id: sessionId,
      properties: properties ?? null,
    });
  } catch {
    // fire-and-forget — never block the happy path
  }
}
