import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContactLeadInput = z.object({
  plan: z.enum(["enterprise", "partenaire", "autre"]).default("enterprise"),
  company_name: z.string().max(200).optional(),
  siret: z.string().max(20).optional(),
  contact_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  budget_range: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
});

export const submitContactLead = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof ContactLeadInput>) => ContactLeadInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const db = supabaseAdmin as unknown as {
      from: (t: string) => {
        insert: (d: object) => {
          select: (c: string) => {
            single: () => Promise<{ data: { id: string } | null; error: unknown }>;
          };
        };
      };
    };

    const { data: row, error } = await db
      .from("contact_leads")
      .insert({
        plan: data.plan,
        company_name: data.company_name ?? null,
        siret: data.siret ?? null,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone ?? null,
        budget_range: data.budget_range ?? null,
        message: data.message ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error("Erreur lors de l'enregistrement de votre demande");

    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    const leadId = (row as { id: string }).id;

    // Notif interne (adresse fixée dans le template)
    await sendAppEmailSafe({
      templateName: "enterprise-lead-notify",
      recipientEmail: "contact@move-spot.com",
      idempotencyKey: `lead-notify-${leadId}`,
      templateData: {
        contactName: data.contact_name,
        company: data.company_name,
        siret: data.siret,
        email: data.email,
        phone: data.phone,
        budgetRange: data.budget_range,
        message: data.message,
        leadId,
      },
    });

    // Confirmation au prospect
    await sendAppEmailSafe({
      templateName: "enterprise-lead-confirm",
      recipientEmail: data.email,
      idempotencyKey: `lead-confirm-${leadId}`,
      templateData: {
        contactName: data.contact_name.split(" ")[0],
        company: data.company_name,
        budgetRange: data.budget_range,
      },
    });

    return { success: true, leadId };
  });
