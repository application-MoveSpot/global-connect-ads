import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";
import { LogoLink } from "@/components/app/LogoLink";
import { NotificationBell } from "@/components/app/NotificationBell";
import { pushNotification } from "@/hooks/useNotifications";
import { PayeeConnectCard } from "@/components/driver/PayeeConnectCard";
import { InstallationJobsPanel } from "@/components/driver/InstallationJobsPanel";
import { DeposeJobsPanel } from "@/components/driver/DeposeJobsPanel";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { getPayeeEarnings, VEHICLE_KIND_LABEL, type VehicleKind } from "@/lib/payments/payee.functions";
import { getDriverVehicleQrTokens } from "@/lib/qr/qr.functions";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { RouteError } from "@/components/app/RouteError";
import { SignalementDialog } from "@/components/shared/SignalementDialog";
import { ControlPhotoPrompt } from "@/components/driver/ControlPhotoPrompt";

type Profile = {
  id: string;
  kind: "driver" | "installer" | "both";
  full_name: string;
  phone: string | null;
  city: string | null;
  status: string;
  vehicle_kind: VehicleKind | null;
  vehicle_plate: string | null;
  certification_status: string;
  certification_notes: string | null;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean | null;
};



export const Route = createFileRoute("/driver/espace")({
  head: () => ({
    meta: [
      { title: "Espace driver / poseur — MoveSpot" },
      {
        name: "description",
        content: "Gérez votre profil provider MoveSpot et vos reversements automatiques sur IBAN.",
      },
      { property: "og:title", content: "Espace driver / poseur — MoveSpot" },
      { property: "og:description", content: "Profil provider et reversements automatiques MoveSpot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChauffeurEspace,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function ChauffeurEspace() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const eur = (cents: number) => (cents / 100).toLocaleString(dateLocale, { style: "currency", currency: "EUR" });
  const navigate = useNavigate();
  const fetchEarnings = useServerFn(getPayeeEarnings);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earnings, setEarnings] = useState<{ totalCents: number; paidCents: number; pendingCents: number } | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const { state: pushState, subscribe: subscribePush } = usePushSubscription(authUserId);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [driverQrs, setDriverQrs] = useState<{ vehicleId: string; vehicleName: string; vehicleType: string; qrImg: string; url: string }[]>([]);
  const [vehicleZones, setVehicleZones] = useState<Record<string, string[]>>({});
  const fetchDriverQrs = useServerFn(getDriverVehicleQrTokens);
  const GPS_STORAGE_KEY = "driver_gps_active_v1";
  const [activeGps, setActiveGps] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(GPS_STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch { /* ignore */ }
    return new Set<string>();
  });
  const toggleGps = (vehicleId: string) => {
    setActiveGps((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) next.delete(vehicleId); else next.add(vehicleId);
      try { localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("payee_profiles")
      .select("id, kind, full_name, phone, city, status, vehicle_kind, vehicle_plate, certification_status, certification_notes, stripe_account_id, stripe_payouts_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) { navigate({ to: "/driver/inscription" }); return; }
      const userId = session.user.id;
      userIdRef.current = userId;
      setAuthUserId(userId);
      const { data } = await supabase
        .from("payee_profiles")
        .select("id, kind, full_name, phone, city, status, vehicle_kind, vehicle_plate, certification_status, certification_notes, stripe_account_id, stripe_payouts_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) { navigate({ to: "/driver/inscription" }); return; }
      setProfile(data as Profile);
      setState("ready");
      fetchEarnings()
        .then((e: any) => setEarnings({ totalCents: e.totalCents, paidCents: e.paidCents, pendingCents: e.pendingCents }))
        .catch(() => setEarnings({ totalCents: 0, paidCents: 0, pendingCents: 0 }));
      // Load driver QR codes for assigned vehicles
      fetchDriverQrs().then(async (res: { vehicles: { vehicleId: string; vehicleName: string; vehicleType: string; token: string }[] }) => {
        const origin = window.location.origin;
        const qrs = await Promise.all(
          res.vehicles.map(async (v: { vehicleId: string; vehicleName: string; vehicleType: string; token: string }) => {
            const url = `${origin}/driver?t=${encodeURIComponent(v.token)}`;
            const qrImg = await QRCode.toDataURL(url, { width: 320, margin: 1 }).catch(() => "");
            return { vehicleId: v.vehicleId, vehicleName: v.vehicleName, vehicleType: v.vehicleType, qrImg, url };
          }),
        );
        const filtered = qrs.filter((q) => q.qrImg);
        setDriverQrs(filtered);
        // Fetch zones for each assigned vehicle
        if (filtered.length > 0) {
          const ids = filtered.map((q) => q.vehicleId);
          supabase.from("vehicles").select("id, zones").in("id", ids).then(({ data }) => {
            if (!data) return;
            const map: Record<string, string[]> = {};
            for (const row of data) map[row.id] = (row.zones ?? []) as string[];
            setVehicleZones(map);
          });
        }
      }).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: certification status + Stripe payout status changes
  useEffect(() => {
    if (!profile) return;
    const userId = userIdRef.current;
    if (!userId) return;
    const channel = supabase
      .channel(`driver-profile-${profile.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payee_profiles", filter: `user_id=eq.${userId}` }, (payload) => {
          const newCertif = (payload.new as Record<string, unknown>).certification_status as string | undefined;
          if (newCertif === "certified") pushNotification(t("driver.espace.certif_notif_ok"), t("driver.espace.certif_notif_ok_desc"));
          else if (newCertif === "rejected") pushNotification(t("driver.espace.certif_notif_rejected"), t("driver.espace.certif_notif_rejected_desc"));
          void loadProfile(userId);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">{t("common.loading")}</div>;
  }

  const certifStatus = profile?.certification_status ?? "pending";
  const certifClassMap: Record<string, string> = {
    pending: "text-amber-500",
    certified: "text-emerald-500",
    rejected: "text-destructive",
  };
  const certifLabelMap: Record<string, string> = {
    pending: t("driver.espace.certif_pending"),
    certified: t("driver.espace.certif_certified"),
    rejected: t("driver.espace.certif_rejected"),
  };
  const certif = {
    label: certifLabelMap[certifStatus] ?? certifLabelMap["pending"]!,
    className: certifClassMap[certifStatus] ?? certifClassMap["pending"]!,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <NotificationBell userId={authUserId} />
            <Link to="/driver" search={{ t: "" }} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              {t("driver.espace.gps_nav_link")}
            </Link>
          </div>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold">{t("driver.espace.hello", { name: profile?.full_name })}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile ? t(`driver.espace.kind_${profile.kind}`) : ""}
            {profile?.city ? ` · ${profile.city}` : ""}
          </p>
        </div>

        {profile && (profile.kind === "installer" || profile.kind === "both") &&
          profile.certification_status === "certified" &&
          (pushState === "default" || pushState === "loading") && (
          <button
            onClick={async () => { setSubscribingPush(true); await subscribePush(); setSubscribingPush(false); }}
            disabled={subscribingPush}
            className="flex items-start gap-3 w-full rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-300 text-left hover:opacity-90 transition disabled:opacity-60"
          >
            <span className="mt-0.5 text-base shrink-0">🔔</span>
            <span>
              {t("driver.espace.push_desc")}{" "}
              <strong className="underline">{subscribingPush ? t("driver.espace.push_activating") : t("driver.espace.push_activate")}</strong>
            </span>
          </button>
        )}

        {profile && !profile.stripe_payouts_enabled && (
          <a
            href="#reversements"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm no-underline transition hover:opacity-90 ${
              profile.stripe_account_id
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            <span className="mt-0.5 text-base">{profile.stripe_account_id ? "⚠️" : "🔴"}</span>
            <span>
              {profile.stripe_account_id
                ? t("driver.espace.stripe_incomplete")
                : t("driver.espace.stripe_no_iban")}
              {" "}
              <strong className="underline">{t("driver.espace.stripe_setup")}</strong>
            </span>
          </a>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("driver.espace.certif_label")}</p>
            <p className={`mt-2 text-sm font-semibold ${certif.className}`}>{certif.label}</p>
            {profile?.certification_notes && (
              <p className="mt-1 text-xs text-muted-foreground">{profile.certification_notes}</p>
            )}
            {profile && (
              <div className="mt-2">
                <StatusHistory
                  entityType="payee_certification"
                  entityId={profile.id}
                  statusLabel={{
                    pending: t("driver.espace.certif_history_pending"),
                    certified: t("driver.espace.certif_history_certified"),
                    rejected: t("driver.espace.certif_history_rejected"),
                  }}
                />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("driver.espace.vehicle_label")}</p>
            <p className="mt-2 text-sm font-semibold">
              {profile?.vehicle_kind ? VEHICLE_KIND_LABEL[profile.vehicle_kind] : t("driver.espace.vehicle_not_set")}
            </p>
            {profile?.vehicle_plate && (
              <p className="mt-1 text-xs text-muted-foreground">{t("driver.espace.vehicle_plate_abbr")} {profile.vehicle_plate}</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("driver.espace.earnings_label")}</p>
            <p className="mt-2 text-2xl font-bold">{eur(earnings?.totalCents ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("driver.espace.earnings_detail", { paid: eur(earnings?.paidCents ?? 0), pending: eur(earnings?.pendingCents ?? 0) })}
            </p>
          </div>
        </div>

        <div id="reversements">
          <PayeeConnectCard />
        </div>

        {profile && (profile.kind === "installer" || profile.kind === "both") ? <InstallationJobsPanel /> : null}
        {profile && (profile.kind === "installer" || profile.kind === "both") ? <DeposeJobsPanel /> : null}


        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <h3 className="font-display text-lg font-semibold">{t("driver.espace.payment_title")}</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>{t("driver.espace.payment_step1")}</li>
            <li>{t("driver.espace.payment_step2")}</li>
            <li>{t("driver.espace.payment_step3")}</li>
            <li>{t("driver.espace.payment_step4")}</li>
          </ol>
        </div>

        {profile && (profile.kind === "driver" || profile.kind === "both") && (
          <InstallationChecklist />
        )}

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">{t("driver.espace.gps_title")}</h3>
          {driverQrs.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("driver.espace.qr_desc")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {driverQrs.map((q) => (
                  <div key={q.vehicleId} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={q.qrImg}
                        alt={`QR ${q.vehicleName}`}
                        width={96}
                        height={96}
                        className="rounded border border-border bg-white p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{q.vehicleName}</p>
                        <p className="text-xs text-muted-foreground">{q.vehicleType}</p>
                        <button
                          type="button"
                          onClick={() => toggleGps(q.vehicleId)}
                          className={`mt-1 mb-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                            activeGps.has(q.vehicleId)
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeGps.has(q.vehicleId) ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {activeGps.has(q.vehicleId) ? t("driver.espace.gps_status_active") : t("driver.espace.gps_status_inactive")}
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {q.vehicleType === "camion_led" ? (
                            <Link
                              to="/driver/ecran"
                              search={{ t: encodeURIComponent(q.url.split("?t=")[1] ?? "") }}
                              className="text-xs font-semibold text-indigo-400 hover:underline"
                            >
                              {t("driver.espace.start_screen")}
                            </Link>
                          ) : (
                            <Link
                              to="/driver"
                              search={{ t: encodeURIComponent(q.url.split("?t=")[1] ?? "") }}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              {t("driver.espace.start_gps")}
                            </Link>
                          )}
                          <a
                            href={q.qrImg}
                            download={`qr-gps-${q.vehicleId}.png`}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            {t("driver.espace.download")}
                          </a>
                        </div>
                      </div>
                    </div>
                    {vehicleZones[q.vehicleId]?.[0] && (
                      <div>
                        <WeatherInstallCheck zone={vehicleZones[q.vehicleId]![0]!} />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("driver.traffic_label")}</span>
                          {(() => {
                            const zone = vehicleZones[q.vehicleId]![0]!;
                            const enc = encodeURIComponent(zone);
                            return (
                              <>
                                <a href={`https://waze.com/ul?q=${enc}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary">Waze</a>
                                <a href={`https://maps.google.com/maps?q=${enc}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary">Google Maps</a>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("driver.espace.qr_empty")}
            </p>
          )}
          <Link to="/driver" search={{ t: "" }} className="inline-block text-sm font-semibold text-primary hover:underline">
            {t("driver.espace.open_gps")}
          </Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border flex justify-end px-4 pb-4">
        <SignalementDialog contextUrl="/driver/espace" triggerLabel="Signaler un problème" />
      </div>
      {/* Bannière de contrôle photo anti-fraude — une par véhicule assigné */}
      {driverQrs.map((q) => (
        <ControlPhotoPrompt key={q.vehicleId} vehicleId={q.vehicleId} />
      ))}
    </div>
  );
}

function InstallationChecklist() {
  const { t } = useTranslation();
  const STEPS = [1, 2, 3, 4, 5] as const;
  const STORAGE_KEY = "driver_checklist_v1";

  const [checked, setChecked] = useState<boolean[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as boolean[];
        if (Array.isArray(parsed) && parsed.length === STEPS.length) return parsed;
      }
    } catch {
      /* ignore */
    }
    return STEPS.map(() => false);
  });

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const allDone = checked.every(Boolean);

  return (
    <div className={`rounded-2xl border p-6 space-y-4 transition ${allDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
      <h3 className="font-display text-lg font-semibold">{t("driver.espace.checklist_title")}</h3>
      <ul className="space-y-3">
        {STEPS.map((_, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={checked[i]}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                checked[i]
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-background hover:border-primary"
              }`}
            >
              {checked[i] && (
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`text-sm leading-snug ${checked[i] ? "line-through text-muted-foreground" : ""}`}>
              {t(`driver.espace.checklist_step_${i + 1}`)}
            </span>
          </li>
        ))}
      </ul>
      {allDone ? (
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t("driver.espace.checklist_all_done")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("driver.espace.checklist_incomplete")}</p>
      )}
    </div>
  );
}
