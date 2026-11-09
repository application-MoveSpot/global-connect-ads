import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Users, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";

type Referral = {
  id: string;
  status: "pending" | "completed";
  created_at: string;
  referee: { full_name: string } | null;
};

export function OwnerReferral() {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [profileResult, referralResult] = await Promise.all([
        sb
          .from("owner_profiles")
          .select("referral_code")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        sb
          .from("referrals")
          .select(`id, status, created_at, referee:owner_profiles!referrals_referee_id_fkey(full_name)`)
          .eq("referrer_id", session.user.id)
          .order("created_at", { ascending: false }),
      ]);

      setReferralCode((profileResult.data as { referral_code?: string | null } | null)?.referral_code ?? null);
      setReferrals((referralResult.data as Referral[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const totalEarned = completedCount * 15;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Referral code card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1">{t("owner.referral.code_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("owner.referral.code_desc")}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 font-mono text-xl font-bold tracking-widest text-primary text-center select-all">
            {referralCode ?? "—"}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!referralCode}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {t("owner.referral.stat_friends")}
            </span>
          </div>
          <p className="text-3xl font-bold">{referrals.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gift className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {t("owner.referral.stat_earned")}
            </span>
          </div>
          <p className="text-3xl font-bold">
            {totalEarned}€
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-secondary/40 p-5 space-y-3">
        <h3 className="font-semibold text-sm">{t("owner.referral.how_title")}</h3>
        {(["step1", "step2", "step3"] as const).map((key, i) => (
          <div key={key} className="flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </div>
            <p className="text-sm text-muted-foreground">{t(`owner.referral.${key}`)}</p>
          </div>
        ))}
      </div>

      {/* History */}
      {referrals.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">{t("owner.referral.history_title")}</h3>
          </div>
          <ul>
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {r.referee?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {r.referee?.full_name ?? t("owner.referral.unknown_referee")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {r.status === "completed" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Gift className="h-3 w-3" />
                    +15€
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    {t("owner.referral.status_pending")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {referrals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("owner.referral.empty")}
        </div>
      )}
    </div>
  );
}
