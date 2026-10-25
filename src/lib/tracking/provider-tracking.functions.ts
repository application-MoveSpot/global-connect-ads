import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BatchSchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
        heading: z.number().nullable().optional(),
        recordedAt: z.string().min(10),
      }),
    )
    .min(1)
    .max(500),
  serviceQuoteId: z.string().uuid().nullable().optional(),
});

export const pushProviderPositionBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifie que l'appelant est bien un prestataire enregistré
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Accès réservé aux prestataires.");

    const rows = data.points.map((p) => ({
      provider_id: userId,
      service_quote_id: data.serviceQuoteId ?? null,
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy ?? null,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      recorded_at: p.recordedAt,
    }));

    const { error } = await supabase.from("provider_positions").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin : récupère les dernières positions de tous les prestataires actifs (24h)
export const getProviderPositionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabaseAdmin
      .from("provider_positions")
      .select("id, provider_id, lat, lng, speed, heading, recorded_at, provider_profiles(full_name, company)")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(5000);

    return { positions: data ?? [] };
  });
