import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let event: { id: string; type: string; data: { object: unknown } };
        try {
          event = await verifyWebhook(request);
        } catch (e) {
          return new Response(`Signature invalide: ${e instanceof Error ? e.message : "?"}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotence — table PK `id` = event id
        const { data: seen } = await supabaseAdmin
          .from("stripe_events")
          .select("id")
          .eq("id", event.id)
          .maybeSingle();
        if (seen) return Response.json({ received: true, duplicate: true });
        await supabaseAdmin
          .from("stripe_events")
          .insert({ id: event.id, type: event.type, payload: event as never } as never);

        try {
          const { handleStripeEvent } = await import("@/lib/stripe-webhook-handlers.server");
          await handleStripeEvent(event, supabaseAdmin);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe webhook] handler error", e);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
