import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IssueSchema = z.object({
  route: z.string().max(500),
  textSnippet: z.string().max(200),
  elementPath: z.string().max(500).optional(),
  detectedLang: z.string().max(10).default("en"),
  expectedLang: z.string().max(10).default("fr"),
});

const BatchSchema = z.object({
  issues: z.array(IssueSchema).max(20),
});

export const reportTranslationIssues = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BatchSchema.parse(d))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !serviceKey) return { inserted: 0 };

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const rows = data.issues.map((i: (typeof data.issues)[number]) => ({
      route: i.route,
      text_snippet: i.textSnippet,
      element_path: i.elementPath ?? null,
      detected_lang: i.detectedLang,
      expected_lang: i.expectedLang,
      occurrences: 1,
    }));

    const { error } = await admin.from("translation_issues").upsert(rows, {
      onConflict: "route,text_snippet",
      ignoreDuplicates: false,
    });

    if (error) {
      // Non-critical: silently ignore (table may not exist in older envs)
      console.warn("[lang-audit] upsert failed:", error.message);
      return { inserted: 0 };
    }

    return { inserted: rows.length };
  });

export const resolveTranslationIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: adminOk } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!adminOk) throw new Error("Accès réservé aux administrateurs");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // translation_issues is not yet in the generated types (pending regen — issue I5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("translation_issues")
      .update({ resolved_at: new Date().toISOString(), resolution_note: data.note ?? null })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTranslationIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminOk } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!adminOk) throw new Error("Accès réservé aux administrateurs");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // translation_issues is not yet in the generated types (pending regen — issue I5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("translation_issues")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return { issues: [] };
    return { issues: data ?? [] };
  });
