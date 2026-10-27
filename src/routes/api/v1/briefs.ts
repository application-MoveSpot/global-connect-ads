import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, apiJson } from "@/lib/api/api-key-auth.server";
import { z } from "zod";

const CreateBriefSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget_max: z.number().positive().optional(),
  vehicle_count: z.number().int().positive().default(1),
  vehicle_types: z.array(z.string()).default([]),
  zones: z.array(z.string()).default([]),
  audience_target: z.string().optional(),
  ad_format: z.string().optional(),
});

export const Route = createFileRoute("/api/v1/briefs")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        const url = new URL(request.url);
        const statusParam = url.searchParams.get("status");
        const BRIEF_STATUSES = ["open", "cancelled", "closed", "fulfilled"] as const;
        if (statusParam && !BRIEF_STATUSES.includes(statusParam as (typeof BRIEF_STATUSES)[number])) {
          return apiJson({ error: `Invalid status filter. Allowed: ${BRIEF_STATUSES.join(", ")}` }, 400);
        }
        const status = statusParam as (typeof BRIEF_STATUSES)[number] | undefined;
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
        const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("advertiser_briefs")
          .select(
            "id, title, description, status, start_date, end_date, budget_max, vehicle_count, vehicle_types, zones, audience_target, ad_format, created_at, updated_at",
            { count: "exact" },
          )
          .eq("advertiser_id", auth.userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);

        const { data, error, count } = await query;
        if (error) return apiJson({ error: error.message }, 500);

        return apiJson({ briefs: data ?? [], total: count ?? 0, limit, offset });
      },

      POST: async ({ request }: { request: Request }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return apiJson({ error: "Invalid JSON body" }, 400);
        }

        const parsed = CreateBriefSchema.safeParse(body);
        if (!parsed.success) {
          return apiJson({ error: "Validation error", details: parsed.error.flatten() }, 422);
        }

        const d = parsed.data;
        if (d.start_date >= d.end_date) {
          return apiJson({ error: "end_date must be after start_date" }, 422);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("advertiser_briefs")
          .insert({
            advertiser_id: auth.userId,
            title: d.title,
            description: d.description,
            start_date: d.start_date,
            end_date: d.end_date,
            budget_max: d.budget_max ?? null,
            vehicle_count: d.vehicle_count,
            vehicle_types: d.vehicle_types as never,
            zones: d.zones,
            audience_target: d.audience_target ?? null,
            ad_format: d.ad_format ?? null,
            status: "open",
          })
          .select(
            "id, title, description, status, start_date, end_date, budget_max, vehicle_count, vehicle_types, zones, audience_target, ad_format, created_at, updated_at",
          )
          .single();

        if (error) return apiJson({ error: error.message }, 500);
        return apiJson({ brief: data }, 201);
      },
    },
  },
});
