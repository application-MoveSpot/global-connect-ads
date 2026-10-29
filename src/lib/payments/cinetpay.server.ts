import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { captureServerException } from "@/lib/sentry.server";

const CINETPAY_API_URL = "https://api-checkout.cinetpay.com/v2/payment";
const CINETPAY_CHECK_URL = "https://api-checkout.cinetpay.com/v2/payment/check";

export function getCinetPayCredentials() {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  return { apiKey: apiKey ?? null, siteId: siteId ?? null };
}

export function isCinetPayConfigured(): boolean {
  const { apiKey, siteId } = getCinetPayCredentials();
  return Boolean(apiKey && siteId);
}

// Verify a CinetPay transaction via their check API.
// Returns the verified transaction data or throws on failure.
export async function verifyCinetPayTransaction(transactionId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  customData: string | null;
}> {
  const { apiKey, siteId } = getCinetPayCredentials();
  if (!apiKey || !siteId) throw new Error("CinetPay non configuré");

  const res = await fetch(CINETPAY_CHECK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  });
  if (!res.ok) throw new Error(`CinetPay check HTTP ${res.status}`);

  const json = (await res.json()) as {
    code: string;
    message?: string;
    data?: {
      status: string;
      amount: string | number;
      currency: string;
      metadata: string | null;
    };
  };

  if (json.code !== "00" || !json.data) {
    throw new Error(`CinetPay check échoué : ${json.message ?? json.code}`);
  }

  return {
    status: json.data.status,
    amount: Number(json.data.amount),
    currency: (json.data.currency ?? "XOF").toLowerCase(),
    customData: json.data.metadata ?? null,
  };
}

// ================== ADVERTISER — Wallet top-up via CinetPay ==================

const CinetPayTopupInput = z.object({
  amountXof: z.number().int().min(100).max(5_000_000),
  returnUrl: z.string().url(),
  campaignBriefId: z.string().uuid().nullable().optional(),
});

export const createCinetPayTopupCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CinetPayTopupInput>) => CinetPayTopupInput.parse(d))
  .handler(async ({ data, context }): Promise<{ payment_url: string; transaction_id: string } | { error: string }> => {
    const { userId, supabase } = context;

    const { apiKey, siteId } = getCinetPayCredentials();
    if (!apiKey || !siteId) {
      return { error: "Paiement mobile indisponible pour le moment." };
    }

    // Rate limiting — same window as Stripe
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { data: recentTxs } = await supabase
      .from("wallet_transactions")
      .select("amount_cents, created_at")
      .eq("user_id", userId)
      .eq("kind", "topup")
      .gte("created_at", oneDayAgo);

    const txs = recentTxs ?? [];
    if (txs.filter((t: { created_at: string }) => t.created_at >= oneHourAgo).length >= 5) {
      return { error: "Trop de recharges en peu de temps. Réessayez dans une heure." };
    }

    const { data: userRow } = await supabase.auth.getUser();
    const email = userRow.user?.email ?? "";

    // Unique transaction ID — CinetPay requires ≤ 32 chars, URL-safe
    const transactionId = `cp_${userId.replace(/-/g, "").slice(0, 16)}_${Date.now()}`;

    const notifyUrl =
      process.env.VITE_APP_URL
        ? `${process.env.VITE_APP_URL}/api/public/cinetpay/webhook`
        : `${data.returnUrl.replace(/\/[^/]*$/, "")}/api/public/cinetpay/webhook`;

    // 655.957 XOF = 1 EUR (parité fixe franc CFA)
    const amountEurCents = Math.round((data.amountXof / 655.957) * 100);
    const customData = JSON.stringify({
      user_id: userId,
      amount_xof: data.amountXof,
      amount_eur_cents: amountEurCents,
      ...(data.campaignBriefId ? { campaign_brief_id: data.campaignBriefId } : {}),
    });

    try {
      const res = await fetch(CINETPAY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: siteId,
          transaction_id: transactionId,
          amount: data.amountXof,
          currency: "XOF",
          description: "Recharge portefeuille MoveSpot",
          return_url: data.returnUrl,
          notify_url: notifyUrl,
          customer_email: email,
          metadata: customData,
          channels: "ALL",
        }),
      });

      if (!res.ok) {
        throw new Error(`CinetPay API HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        code: string;
        message?: string;
        data?: { payment_token: string; payment_url: string };
      };

      if (json.code !== "201" || !json.data?.payment_url) {
        return { error: json.message ?? "Impossible d'initialiser le paiement CinetPay." };
      }

      return { payment_url: json.data.payment_url, transaction_id: transactionId };
    } catch (error) {
      captureServerException(error, { category: "payment", userId });
      return { error: "Erreur lors de l'initialisation du paiement mobile." };
    }
  });
