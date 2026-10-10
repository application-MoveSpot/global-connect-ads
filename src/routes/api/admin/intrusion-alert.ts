import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendAppEmailSafe } from "@/lib/email/send.server";

export const Route = createFileRoute("/api/admin/intrusion-alert")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
        const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Vérifier que l'appelant est bien authentifié (pas nécessairement admin)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.slice("Bearer ".length).trim();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userAgent = request.headers.get("User-Agent") ?? "inconnu";
        const attemptedAt = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

        // Logger la tentative dans la base de données
        await supabase.from("admin_intrusion_attempts").insert({
          user_id: user.id,
          email: user.email ?? null,
          user_agent: userAgent,
          attempted_at: new Date().toISOString(),
        });

        // Envoyer l'alerte email (ne bloque pas si l'email échoue)
        await sendAppEmailSafe({
          templateName: "admin-intrusion-alert",
          recipientEmail: "rakounklub@gmail.com",
          idempotencyKey: `intrusion-${user.id}-${Date.now()}`,
          templateData: {
            intruderEmail: user.email ?? "inconnu",
            intruderUserId: user.id,
            attemptedAt,
            userAgent,
          },
        });

        return Response.json({ logged: true });
      },
    },
  },
});
