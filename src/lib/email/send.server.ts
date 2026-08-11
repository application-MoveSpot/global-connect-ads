/**
 * Envoi d'emails applicatifs déclenché côté serveur (sans jeton utilisateur).
 * Rend le modèle React Email, vérifie la liste de suppression puis met le
 * message en file d'attente — le dispatcher gère l'envoi et les relances.
 * NE JAMAIS importer ce fichier depuis du code navigateur.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "MoveSpot";
const SENDER_DOMAIN = "notify.move-spot.com";
const FROM_DOMAIN = "notify.move-spot.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sendAppEmail(params: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}): Promise<{ sent: boolean; reason?: string }> {
  const template = TEMPLATES[params.templateName];
  if (!template) return { sent: false, reason: "template_not_found" };

  const recipient = (template.to || params.recipientEmail || "").trim();
  if (!recipient) return { sent: false, reason: "missing_recipient" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = recipient.toLowerCase();
  const messageId = crypto.randomUUID();

  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (suppressionError) return { sent: false, reason: "suppression_check_failed" };
  if (suppressed) return { sent: false, reason: "email_suppressed" };

  // Un jeton de désinscription par adresse
  let unsubscribeToken: string;
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();

  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token;
  } else if (!existing) {
    const fresh = generateToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert({ token: fresh, email: normalized } as never, {
        onConflict: "email",
        ignoreDuplicates: true,
      });
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    if (!stored) return { sent: false, reason: "token_error" };
    unsubscribeToken = stored.token;
  } else {
    return { sent: false, reason: "email_suppressed" };
  }

  const element = React.createElement(template.component, params.templateData ?? {});
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function"
      ? template.subject((params.templateData ?? {}) as Record<string, unknown>)
      : template.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: params.templateName,
    recipient_email: recipient,
    status: "pending",
  } as never);

  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: params.templateName,
      idempotency_key: params.idempotencyKey ?? messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    } as never,
  });

  if (enqueueError) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: params.templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    } as never);
    return { sent: false, reason: "enqueue_failed" };
  }

  return { sent: true };
}

/** Ne fait jamais échouer l'action métier à cause d'un email. */
export async function sendAppEmailSafe(params: Parameters<typeof sendAppEmail>[0]) {
  try {
    return await sendAppEmail(params);
  } catch (error) {
    console.error("sendAppEmail failed", error);
    return { sent: false, reason: "exception" };
  }
}
