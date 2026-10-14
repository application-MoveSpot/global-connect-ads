import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Papa from "papaparse";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RowSchema = z.object({
  name: z.string().min(1).max(160),
  type: z.string().min(1).max(80),
  format_publicitaire: z.string().min(1).max(120),
  price_per_day: z.coerce.number().min(0).max(100000),
  city: z.string().max(120).optional().nullable(),
  license_plate: z.string().max(20).optional().nullable(),
  condition: z.enum(["bon", "moyen", "mauvais"]).optional().default("bon"),
});

export const importVehiclesCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ csv: z.string().min(1).max(2_000_000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: owner, error: oErr } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!owner) throw new Error("Profil propriétaire introuvable.");

    const parsed = Papa.parse(data.csv.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    if (parsed.errors.length) {
      throw new Error(`CSV invalide ligne ${parsed.errors[0].row}: ${parsed.errors[0].message}`);
    }

    const rows: any[] = [];
    const errors: { line: number; error: string }[] = [];
    parsed.data.forEach((raw: Record<string, string>, i: number) => {
      const r = RowSchema.safeParse(raw);
      if (!r.success) {
        errors.push({
          line: i + 2,
          error: r.error.issues.map((x) => `${x.path}: ${x.message}`).join(", "),
        });
        return;
      }
      rows.push({
        owner_id: owner.id,
        name: r.data.name,
        type: r.data.type,
        format_publicitaire: r.data.format_publicitaire,
        price_per_day: r.data.price_per_day,
        condition: r.data.condition ?? "bon",
        status: "pending",
        photos: [],
      });
    });

    if (rows.length === 0) {
      return { inserted: 0, errors };
    }

    const { data: inserted, error } = await supabase.from("vehicles").insert(rows).select("id");
    if (error) throw new Error(error.message);

    return { inserted: inserted?.length ?? 0, errors };
  });
