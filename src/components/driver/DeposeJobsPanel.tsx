import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrencyFromLang, CURRENCY_CONFIGS } from "@/lib/currency";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listDeposeJobs,
  claimDeposeJob,
  unclaimDeposeJob,
} from "@/lib/providers/installation.functions";
import { DeposePhotosPanel } from "@/components/driver/DeposePhotosPanel";
import { PoseFeeEstimateCard } from "@/components/provider/PoseFeeEstimateCard";

type DeposeJob = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  company: string;
  start_date: string | null;
  end_date: string | null;
  depose_photos: unknown;
  depose_status: string | null;
  depose_notes: string | null;
  creative_files: string[] | null;
  total_price: number | null;
  depose_fee_cents: number | null;
};

const fr = (d: string | null, lang: string) => (d ? new Date(d).toLocaleDateString(lang) : "—");
const eur = (n: number | null, lang: string) => {
  if (n == null) return null;
  const currency = getCurrencyFromLang(lang);
  const { locale, code } = CURRENCY_CONFIGS[currency];
  return (n / 100).toLocaleString(locale, { style: "currency", currency: code });
};

function daysAfter(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - target.getTime()) / 86400000);
}

function mapsUrl(location: string | null): string | null {
  if (!location) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function isClaimed(photos: unknown): boolean {
  return !!(photos as Record<string, unknown> | null)?.claimed_by;
}

export function DeposeJobsPanel() {
  const { t, i18n } = useTranslation();
  const fetchJobs = useServerFn(listDeposeJobs);
  const doClaim = useServerFn(claimDeposeJob);
  const doUnclaim = useServerFn(unclaimDeposeJob);

  const [jobs, setJobs] = useState<DeposeJob[] | null>(null);
  const [isInstaller, setIsInstaller] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchJobs()
      .then((r: { isInstaller: boolean; jobs: DeposeJob[] }) => {
        setIsInstaller(r.isInstaller);
        setJobs(r.jobs ?? []);
      })
      .catch(() => setJobs([]));
  }, [fetchJobs]);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (jobId: string) => {
    setClaiming(jobId);
    try {
      await doClaim({ data: { campaignRequestId: jobId } });
      toast.success(t("depose_jobs.toast_claimed"));
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("depose_jobs.err_claim"));
    } finally {
      setClaiming(null);
    }
  };

  const handleUnclaim = async (jobId: string) => {
    setClaiming(jobId);
    try {
      await doUnclaim({ data: { campaignRequestId: jobId } });
      toast.success(t("depose_jobs.toast_released"));
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("depose_jobs.err_release"));
    } finally {
      setClaiming(null);
    }
  };

  if (jobs === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t("depose_jobs.loading")}
      </div>
    );
  }

  if (!isInstaller) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">{t("depose_jobs.title")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("depose_jobs.not_installer_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">{t("depose_jobs.title")}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {t("depose_jobs.badge_count", { count: jobs.length })}
        </span>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {t("depose_jobs.description")}
      </p>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("depose_jobs.empty")}</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const daysElapsed = daysAfter(job.end_date);
            const urgent = daysElapsed !== null && daysElapsed >= 3;
            const claimed = isClaimed(job.depose_photos);
            const maps = mapsUrl(job.spot_location);

            return (
              <div
                key={job.id}
                className={`rounded-xl border p-4 ${urgent ? "border-amber-500/50 bg-amber-500/5" : "border-border"}`}
              >
                {/* Header */}
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{job.spot_name}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    {job.depose_fee_cents != null && (
                      <p className="text-xs font-semibold text-primary">
                        {t("depose_jobs.remuneration", { amount: eur(job.depose_fee_cents, i18n.language) })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {fr(job.start_date, i18n.language)} → {fr(job.end_date, i18n.language)}
                    </p>
                  </div>
                </div>

                {/* Urgency badge */}
                {daysElapsed !== null && daysElapsed >= 0 && (
                  <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${urgent ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}>
                    <span>{urgent ? "⏰" : "📅"}</span>
                    {daysElapsed === 0
                      ? t("depose_jobs.urgency_today")
                      : t("depose_jobs.urgency_days", { count: daysElapsed, s: daysElapsed > 1 ? "s" : "" })}
                    {urgent ? t("depose_jobs.urgency_suffix") : ""}
                  </div>
                )}

                {/* Location */}
                {(job.spot_location || maps) && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>📍</span>
                    <span>{job.spot_location ?? t("depose_jobs.location_unknown")}</span>
                    {maps && (
                      <a
                        href={maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 rounded-lg border border-border bg-card px-2 py-1 font-semibold text-primary hover:bg-secondary transition"
                      >
                        {t("depose_jobs.directions")}
                      </a>
                    )}
                  </div>
                )}

                {/* Fee estimate */}
                <PoseFeeEstimateCard
                  vehicleType="autre"
                  location={job.spot_location ?? ""}
                  storedDeposeFeeCents={job.depose_fee_cents}
                  operation="depose"
                  className="mb-3"
                />

                {/* Claim / Unclaim */}
                {!claimed ? (
                  <button
                    onClick={() => handleClaim(job.id)}
                    disabled={claiming === job.id}
                    className="mb-3 w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
                  >
                    {claiming === job.id ? t("depose_jobs.btn_claiming") : t("depose_jobs.btn_claim")}
                  </button>
                ) : (
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("depose_jobs.claimed")}
                    </span>
                    {job.depose_status === "pending" && (
                      <button
                        onClick={() => handleUnclaim(job.id)}
                        disabled={claiming === job.id}
                        className="text-xs text-muted-foreground hover:text-destructive underline transition disabled:opacity-50"
                      >
                        {t("depose_jobs.btn_release")}
                      </button>
                    )}
                  </div>
                )}

                <DeposePhotosPanel
                  campaignRequestId={job.id}
                  deposePhotos={job.depose_photos}
                  deposeStatus={job.depose_status}
                  deposeNotes={job.depose_notes}
                  onSubmitted={load}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
