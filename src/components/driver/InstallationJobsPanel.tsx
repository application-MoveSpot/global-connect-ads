import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrencyFromLang, CURRENCY_CONFIGS } from "@/lib/currency";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listInstallationJobs,
  listCompletedInstallationJobs,
  claimInstallationJob,
  unclaimInstallationJob,
} from "@/lib/providers/installation.functions";
import { InstallationPhotosPanel } from "@/components/driver/InstallationPhotosPanel";
import { InstallationKit } from "@/components/driver/InstallationKit";
import { PoseFeeEstimateCard } from "@/components/provider/PoseFeeEstimateCard";

type Job = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  company: string;
  start_date: string | null;
  end_date: string | null;
  installation_photos: unknown;
  installation_status: string | null;
  installation_notes: string | null;
  creative_files: string[] | null;
  total_price: number | null;
  pose_fee_cents: number | null;
  vehicle_id: string | null;
};

type CompletedJob = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  company: string;
  start_date: string | null;
  end_date: string | null;
  installation_photos: unknown;
  total_price: number | null;
};

const fr = (d: string | null, lang: string) => (d ? new Date(d).toLocaleDateString(lang) : "—");
const eur = (n: number | null, lang: string) => {
  if (n == null) return null;
  const currency = getCurrencyFromLang(lang);
  const { locale } = CURRENCY_CONFIGS[currency];
  return n.toLocaleString(locale, { style: "currency", currency });
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function mapsUrl(location: string | null): string | null {
  if (!location) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function isClaimed(photos: unknown): boolean {
  return !!(photos as Record<string, unknown> | null)?.claimed_by;
}

export function InstallationJobsPanel() {
  const { t, i18n } = useTranslation();
  const fetchJobs = useServerFn(listInstallationJobs);
  const fetchCompleted = useServerFn(listCompletedInstallationJobs);
  const doClaim = useServerFn(claimInstallationJob);
  const doUnclaim = useServerFn(unclaimInstallationJob);

  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isInstaller, setIsInstaller] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchJobs()
      .then((r: { isInstaller: boolean; jobs: Job[] }) => {
        setIsInstaller(r.isInstaller);
        setJobs(r.jobs ?? []);
      })
      .catch(() => setJobs([]));
  }, [fetchJobs]);

  const loadCompleted = useCallback(() => {
    fetchCompleted()
      .then((r: { jobs: CompletedJob[] }) => setCompletedJobs(r.jobs ?? []))
      .catch(() => {});
  }, [fetchCompleted]);

  useEffect(() => {
    load();
    loadCompleted();
  }, [load, loadCompleted]);

  const handleClaim = async (jobId: string) => {
    setClaiming(jobId);
    try {
      await doClaim({ data: { campaignRequestId: jobId } });
      toast.success(t("install_jobs.toast_claimed"));
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("install_jobs.toast_claim_err"));
    } finally {
      setClaiming(null);
    }
  };

  const handleUnclaim = async (jobId: string) => {
    setClaiming(jobId);
    try {
      await doUnclaim({ data: { campaignRequestId: jobId } });
      toast.success(t("install_jobs.toast_released"));
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("install_jobs.toast_release_err"));
    } finally {
      setClaiming(null);
    }
  };

  if (jobs === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t("install_jobs.loading")}
      </div>
    );
  }

  if (!isInstaller) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">{t("install_jobs.title")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("install_jobs.not_installer")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">{t("install_jobs.title")}</h3>
        <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
          <button
            onClick={() => setTab("pending")}
            className={`rounded px-3 py-1 font-semibold transition ${tab === "pending" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("install_jobs.tab_pending", { n: jobs.length })}
          </button>
          <button
            onClick={() => setTab("done")}
            className={`rounded px-3 py-1 font-semibold transition ${tab === "done" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("install_jobs.tab_done", { n: completedJobs.length })}
          </button>
        </div>
      </div>

      {tab === "pending" && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("install_jobs.pending_desc")}
          </p>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("install_jobs.none_pending")}</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const days = daysUntil(job.start_date);
                const urgent = days !== null && days <= 3 && days >= 0;
                const overdue = days !== null && days < 0;
                const claimed = isClaimed(job.installation_photos);
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
                        {job.total_price != null && (
                          <p className="text-xs font-semibold text-primary">
                            {t("install_jobs.budget", { amount: eur(job.total_price, i18n.language) })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {fr(job.start_date, i18n.language)} → {fr(job.end_date, i18n.language)}
                        </p>
                      </div>
                    </div>

                    {/* Deadline countdown */}
                    {days !== null && !overdue && (
                      <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${urgent ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}>
                        <span>{urgent ? "⏰" : "📅"}</span>
                        {days === 0
                          ? t("install_jobs.urgent_today")
                          : t("install_jobs.due_before", { date: fr(job.start_date, i18n.language), days })}
                      </div>
                    )}
                    {overdue && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                        {t("install_jobs.overdue")}
                      </div>
                    )}

                    {/* Location + Maps */}
                    {(job.spot_location || maps) && (
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>📍</span>
                        <span>{job.spot_location ?? t("install_jobs.location_unknown")}</span>
                        {maps && (
                          <a
                            href={maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto shrink-0 rounded-lg border border-border bg-card px-2 py-1 font-semibold text-primary hover:bg-secondary transition"
                          >
                            {t("install_jobs.directions")}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Fee estimate */}
                    <PoseFeeEstimateCard
                      vehicleType="autre"
                      location={job.spot_location ?? ""}
                      storedPoseFeeCents={job.pose_fee_cents}
                      operation="pose"
                      className="mb-3"
                    />

                    {/* Claim / Unclaim */}
                    {!claimed ? (
                      <button
                        onClick={() => handleClaim(job.id)}
                        disabled={claiming === job.id}
                        className="mb-3 w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
                      >
                        {claiming === job.id ? t("install_jobs.booking") : t("install_jobs.take_job")}
                      </button>
                    ) : (
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {t("install_jobs.job_claimed")}
                        </span>
                        {job.installation_status === "pending" && (
                          <button
                            onClick={() => handleUnclaim(job.id)}
                            disabled={claiming === job.id}
                            className="text-xs text-muted-foreground hover:text-destructive underline transition disabled:opacity-50"
                          >
                            {t("install_jobs.release")}
                          </button>
                        )}
                      </div>
                    )}

                    <InstallationKit campaignRequestId={job.id} creativeFiles={job.creative_files} />
                    <InstallationPhotosPanel
                      campaignRequestId={job.id}
                      installationPhotos={job.installation_photos}
                      installationStatus={job.installation_status}
                      installationNotes={job.installation_notes}
                      onSubmitted={load}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "done" && (
        <>
          {completedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("install_jobs.none_done")}</p>
          ) : (
            <div className="space-y-3">
              {completedJobs.map((job) => {
                const maps = mapsUrl(job.spot_location);
                return (
                  <div key={job.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{job.spot_name}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fr(job.start_date, i18n.language)} → {fr(job.end_date, i18n.language)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-semibold">
                          {t("install_jobs.validated")}
                        </span>
                        {job.total_price != null && (
                          <p className="text-xs text-muted-foreground mt-1">{eur(job.total_price, i18n.language)}</p>
                        )}
                      </div>
                    </div>
                    {job.spot_location && maps && (
                      <a
                        href={maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                      >
                        📍 {job.spot_location}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
