import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rateLimit.server";

const SubmitSignalementInput = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
  contextUrl: z.string().max(500).optional(),
});

export const submitSignalement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SubmitSignalementInput>) =>
    SubmitSignalementInput.parse(d),
  )
  .handler(async ({ data, context }) => {
    assertRateLimit(`signalement:${context.userId}`, { maxRequests: 10, windowMs: 10 * 60_000 });
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("support_tickets" as never)
      .insert({
        user_id: userId,
        subject: data.subject,
        message: data.message,
        context_url: data.contextUrl ?? null,
        status: "open",
        created_at: new Date().toISOString(),
      } as never);

    if (error) throw new Error(error.message);

    // Notify all admins (best-effort)
    try {
      const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
      const { data: admins } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role" as never, "admin");

      const userInfo = await supabase.auth.getUser();
      const email = userInfo.data.user?.email ?? "utilisateur";

      for (const admin of (admins ?? []) as Array<{ user_id: string }>) {
        await sendWebPushToUser(admin.user_id, {
          title: "🚨 Nouveau signalement",
          body: `${email} : ${data.subject}`,
          url: "/admin/dashboard",
        }).catch(() => {/* best-effort */});
      }
    } catch { /* best-effort */ }

    return { ok: true };
  });

// ─── Admin : lister les tickets ouverts ──────────────────────────────────────

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  context_url: string | null;
  status: "open" | "resolved";
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
  user_email?: string;
};

export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tickets } = await supabaseAdmin
      .from("support_tickets" as never)
      .select("*")
      .order("created_at" as never, { ascending: false })
      .limit(100);

    if (!tickets) return [];

    // Enrich with user emails
    const enriched = await Promise.all(
      (tickets as Array<Record<string, unknown>>).map(async (t) => {
        try {
          const auth = await supabaseAdmin.auth.admin.getUserById(t.user_id as string);
          return { ...t, user_email: auth.data?.user?.email ?? t.user_id } as SupportTicket;
        } catch {
          return { ...t, user_email: t.user_id } as SupportTicket;
        }
      }),
    );

    return enriched;
  });

// ─── Admin : résoudre un ticket ───────────────────────────────────────────────

const ResolveTicketInput = z.object({
  ticketId: z.string().uuid(),
  response: z.string().min(1).max(1000),
});

export const adminResolveTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ResolveTicketInput>) =>
    ResolveTicketInput.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get ticket to notify user
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets" as never)
      .select("user_id, subject")
      .eq("id" as never, data.ticketId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("support_tickets" as never)
      .update({
        status: "resolved",
        admin_response: data.response,
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, data.ticketId);

    if (error) throw new Error(error.message);

    // Notify user (best-effort)
    try {
      const t = ticket as { user_id: string; subject: string } | null;
      if (t?.user_id) {
        const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
        await sendWebPushToUser(t.user_id, {
          title: "✅ Signalement traité",
          body: `Votre signalement "${t.subject}" a reçu une réponse de l'équipe.`,
          url: "/",
        });
      }
    } catch { /* best-effort */ }

    return { ok: true };
  });
