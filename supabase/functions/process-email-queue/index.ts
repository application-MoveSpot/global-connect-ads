import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_RETRIES = 3;
const VT = 30; // visibility timeout in seconds — message invisible to other workers during processing

const QUEUES = [
  { name: "auth_emails", dlq: "auth_emails_dlq" },
  { name: "transactional_emails", dlq: "transactional_emails_dlq" },
];

type QueueMsg = { msg_id: number; read_ct: number; message: EmailPayload };
type EmailPayload = {
  message_id: string;
  to: string;
  from: string;
  sender_domain: string;
  subject: string;
  html: string;
  text: string;
  label?: string;
  unsubscribe_token?: string;
  idempotency_key?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check rate-limit cooldown
  const { data: state } = await supabase
    .from("email_send_state")
    .select("retry_after_until, batch_size, send_delay_ms")
    .eq("id", 1)
    .single();

  if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
    return new Response(JSON.stringify({ ok: true, skipped: "rate_limited" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const batchSize: number = state?.batch_size ?? 10;
  const sendDelayMs: number = state?.send_delay_ms ?? 200;

  let totalSent = 0;
  let totalFailed = 0;

  for (const queue of QUEUES) {
    const { data: messages } = await supabase.rpc("read_email_batch", {
      queue_name: queue.name,
      batch_size: batchSize,
      vt: VT,
    });

    if (!messages || (messages as QueueMsg[]).length === 0) continue;

    for (const msg of messages as QueueMsg[]) {
      const payload = msg.message;
      const msgId = msg.msg_id;
      const readCount = msg.read_ct;

      // Idempotency: skip if already sent
      const { data: alreadySent } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("message_id", payload.message_id)
        .eq("status", "sent")
        .maybeSingle();

      if (alreadySent) {
        await supabase.rpc("delete_email", { queue_name: queue.name, message_id: msgId });
        continue;
      }

      // Move to DLQ after max retries
      if (readCount > MAX_RETRIES) {
        await supabase.rpc("move_to_dlq", {
          source_queue: queue.name,
          dlq_name: queue.dlq,
          message_id: msgId,
          payload: payload as unknown as Record<string, unknown>,
        });
        await supabase.from("email_send_log").insert({
          message_id: payload.message_id,
          template_name: payload.label ?? "unknown",
          recipient_email: payload.to,
          status: "dlq",
          error_message: "Exceeded max retries",
        });
        totalFailed++;
        continue;
      }

      // Send via Resend
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        };

        const emailBody: Record<string, unknown> = {
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        };

        if (payload.unsubscribe_token) {
          emailBody.headers = {
            "List-Unsubscribe": `<https://${payload.sender_domain}/unsubscribe?token=${payload.unsubscribe_token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          };
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers,
          body: JSON.stringify(emailBody),
        });

        if (res.ok) {
          await supabase.rpc("delete_email", { queue_name: queue.name, message_id: msgId });
          await supabase.from("email_send_log").insert({
            message_id: payload.message_id,
            template_name: payload.label ?? "unknown",
            recipient_email: payload.to,
            status: "sent",
          });
          totalSent++;
        } else if (res.status === 429) {
          // Rate limited by Resend — back off
          const retryAfter = res.headers.get("Retry-After");
          const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : 60_000;
          const retryAfterUntil = new Date(Date.now() + cooldownMs).toISOString();
          await supabase
            .from("email_send_state")
            .update({ retry_after_until: retryAfterUntil, updated_at: new Date().toISOString() })
            .eq("id", 1);
          break; // stop processing this batch
        } else {
          const errBody = await res.json().catch(() => ({}));
          console.error("Resend error", res.status, errBody);
          totalFailed++;
          // message stays in queue and will be retried after VT expires
        }
      } catch (err) {
        console.error("Fetch error", err);
        totalFailed++;
      }

      if (sendDelayMs > 0) {
        await new Promise((r) => setTimeout(r, sendDelayMs));
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent: totalSent, failed: totalFailed }), {
    headers: { "Content-Type": "application/json" },
  });
});
