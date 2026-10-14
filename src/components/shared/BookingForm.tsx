import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { Spot } from "./AdSpots";
import { supabase } from "@/integrations/supabase/client";
import { FORBIDDEN_KEYWORDS } from "@/lib/campaigns/forbidden-keywords";
import { detectContact } from "@/lib/moderation/contact-detection";
import { COUNTRY_OPTIONS } from "@/lib/fleet/driving-rules";
import { ItineraryPlanner, type ItineraryData } from "./ItineraryPlanner";
import { notifyCampaignSubmitted } from "@/lib/campaigns/campaign-notifications.server";
import { getInstallerFeeConfig } from "@/lib/campaigns/installer-fees.functions";
import type { DateRange } from "react-day-picker";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { VehiclePhotoAdPreview } from "@/components/advertiser/VehiclePhotoAdPreview";
import { resizeImageFile } from "@/lib/images/resize";

type BookedPeriod = { start_date: string; end_date: string };
type DateConflict = {
  conflictStart: string;
  conflictEnd: string;
  suggestion: { start: string; end: string } | null;
};

function checkDateOverlap(
  start: string,
  end: string,
  periods: BookedPeriod[],
): BookedPeriod | null {
  return periods.find((p) => p.start_date <= end && p.end_date >= start) ?? null;
}

function nextAvailableSlot(
  days: number,
  periods: BookedPeriod[],
  earliest: Date,
): { start: string; end: string } {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  let candidateStart = new Date(earliest);
  for (const p of sorted) {
    const pStart = new Date(p.start_date);
    const candidateEnd = addDays(candidateStart, days - 1);
    if (candidateEnd < pStart) break;
    const after = new Date(p.end_date);
    after.setDate(after.getDate() + 1);
    if (after > candidateStart) candidateStart = after;
  }
  return { start: toISO(candidateStart), end: toISO(addDays(candidateStart, days - 1)) };
}

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

function BookingDayButton({
  modifiers,
  onClick,
  className,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const isBooked = !!modifiers?.booked;
  return (
    <CalendarDayButton
      modifiers={modifiers}
      onClick={
        isBooked
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : onClick
      }
      className={cn(
        className,
        isBooked &&
          "!bg-red-100 dark:!bg-red-950/40 !text-red-600 dark:!text-red-400 line-through !cursor-not-allowed hover:!bg-red-100 dark:hover:!bg-red-950/40",
      )}
      {...props}
    />
  );
}

type Props = {
  spot: Spot | null;
  onClose: () => void;
};

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "no-profile"; userId: string; email: string }
  | {
      kind: "ready";
      userId: string;
      profile: { full_name: string; company: string | null; email: string };
    };

const SCREEN_VEHICLE_TYPES = ["camion_led", "sac_a_dos_lcd"];

export function BookingForm({ spot, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { fmtAmount } = useCurrency();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [message, setMessage] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryData>({
    waypoints: [],
    zones: [],
    pois: [],
    distanceKm: 0,
    impressionsPerDay: 0,
  });

  const notifyFn = useServerFn(notifyCampaignSubmitted);
  const getInstallerFees = useServerFn(getInstallerFeeConfig);
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [poseLocationType, setPoseLocationType] = useState<"garage" | "domicile" | null>(null);
  const [installationAddress, setInstallationAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "rejected" | "success" | "loading">("idle");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [bookedPeriods, setBookedPeriods] = useState<BookedPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState(false);
  const [dateConflict, setDateConflict] = useState<DateConflict | null>(null);
  const [hasUnpaidCampaign, setHasUnpaidCampaign] = useState(false);

  // Calendrier de réservation : min 3 jours d'avance, durée 1 à 30 jours
  const MIN_LEAD_DAYS = 3;
  const MAX_DURATION_DAYS = 30;
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minStart = new Date(today);
  minStart.setDate(minStart.getDate() + MIN_LEAD_DAYS);
  const defaultStart = new Date(minStart);
  const defaultEnd = new Date(minStart);
  defaultEnd.setDate(defaultEnd.getDate() + 6); // 7 jours
  const [startDate, setStartDate] = useState<string>(toISO(defaultStart));
  const [endDate, setEndDate] = useState<string>(toISO(defaultEnd));

  // Plage horaire de diffusion (par défaut 08:00 → 20:00, soit 12h)
  // Limites : 06:00 min, 22:00 max, 10h/jour max (Règlement CE 561/2006 + droit au repos DUDH Art.24)
  const DAILY_START_MIN = "06:00";
  const DAILY_END_MAX = "22:00";
  const MAX_HOURS_PER_DAY = 10;
  const MIN_HOURS_PER_DAY = 1;

  const [dailyStart, setDailyStart] = useState<string>("08:00");
  const [dailyEnd, setDailyEnd] = useState<string>("20:00");

  const DEFAULT_COUNTRY = COUNTRY_OPTIONS[0]; // France métropolitaine
  const [countryKey, setCountryKey] = useState<string>(DEFAULT_COUNTRY.label);
  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.label === countryKey) ?? DEFAULT_COUNTRY;

  const daysCount = (() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  })();

  const totalPrice = spot ? daysCount * spot.price : 0;

  const bookedModifiers = bookedPeriods.map((p) => ({
    from: new Date(p.start_date + "T00:00:00"),
    to: new Date(p.end_date + "T00:00:00"),
  }));
  const [calRange, setCalRange] = useState<DateRange | undefined>({
    from: new Date(toISO(defaultStart) + "T00:00:00"),
    to: new Date(toISO(defaultEnd) + "T00:00:00"),
  });

  const MAX_FILES = 5;
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
  const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime";

  // Estimation impressions/jour = km/jour × 1000 × coef format × coef mobilité × coef plage horaire
  const formatMultiplier = (() => {
    const f = (spot?.format ?? "").toLowerCase();
    if (f.includes("lcd") || f.includes("écran") || f.includes("ecran") || f.includes("digital"))
      return 1.4;
    if (f.includes("toit") || f.includes("totem")) return 1.2;
    if (f.includes("affiche") || f.includes("sticker") || f.includes("covering")) return 1.0;
    return 1.0;
  })();
  const mobilityMultiplier = (() => {
    const t = (spot?.vehicleType ?? "").toLowerCase();
    if (t === "taxi" || t === "vtc") return 1.3; // forte rotation urbaine
    if (t === "food_truck") return 1.1; // stationne en lieux passants
    if (t === "scooter") return 0.9; // visibilité plus courte
    if (t === "van" || t === "voiture") return 1.0;
    return 1.0;
  })();
  const hoursPerDay = (() => {
    const [sh, sm] = dailyStart.split(":").map(Number);
    const [eh, em] = dailyEnd.split(":").map(Number);
    const h = eh + em / 60 - (sh + sm / 60);
    return Math.max(1, Math.min(24, h));
  })();
  const hoursMultiplier = hoursPerDay / 12; // référence : 12h/jour
  const suggestedImpressions = spot?.kmPerDay
    ? Math.round(spot.kmPerDay * 1000 * formatMultiplier * mobilityMultiplier * hoursMultiplier)
    : null;

  useEffect(() => {
    if (!spot) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setAuth({ kind: "anon" });
        return;
      }
      const userId = data.session.user.id;
      const email = data.session.user.email ?? "";
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("full_name, company")
        .eq("user_id", userId)
        .maybeSingle();
      if (!prof) {
        setAuth({ kind: "no-profile", userId, email });
        return;
      }
      setAuth({
        kind: "ready",
        userId,
        profile: { full_name: prof.full_name, company: prof.company, email },
      });
    })();
  }, [spot]);

  // Block submission if the advertiser has an approved but unpaid campaign.
  useEffect(() => {
    if (auth.kind !== "ready") return;
    supabase
      .from("campaign_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("status", "approved")
      .neq("payment_status", "paid")
      .then(({ count }) => setHasUnpaidCampaign((count ?? 0) > 0));
  }, [auth]);

  // Load already-booked date ranges via the SECURITY DEFINER RPC (bypasses RLS,
  // returns only start_date/end_date — no sensitive data exposed).
  useEffect(() => {
    if (!spot?.vehicleId) {
      setBookedPeriods([]);
      return;
    }
    setPeriodsLoading(true);
    setPeriodsError(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc("get_vehicle_booked_periods", { p_vehicle_id: spot.vehicleId })
      .then(({ data, error }: { data: BookedPeriod[] | null; error: unknown }) => {
        if (error) {
          setPeriodsError(true);
          setBookedPeriods([]);
        } else setBookedPeriods((data ?? []) as BookedPeriod[]);
      })
      .catch(() => setPeriodsError(true))
      .finally(() => setPeriodsLoading(false));
  }, [spot?.vehicleId]);

  if (!spot) return null;

  const goSignIn = () => {
    onClose();
    navigate({
      to: "/advertiser/inscription",
      search: { redirect: window.location.pathname + "#spots" },
    });
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    // Always update the visual calendar state so react-day-picker can show
    // the in-progress selection (from only, no to yet) without resetting.
    setCalRange(range);
    setDateConflict(null);
    setStatus("idle");
    // Only validate and commit once the user has picked both dates.
    if (!range?.from || !range?.to) return;
    const fromISO = toISO(range.from);
    const endISO = toISO(range.to);
    const days = Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1;
    const conflict = checkDateOverlap(fromISO, endISO, bookedPeriods);
    if (conflict) {
      setDateConflict({
        conflictStart: conflict.start_date,
        conflictEnd: conflict.end_date,
        suggestion: nextAvailableSlot(days, bookedPeriods, minStart),
      });
      return;
    }
    setStartDate(fromISO);
    setEndDate(endISO);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.kind !== "ready") return;
    const lower = message.toLowerCase();
    const match = FORBIDDEN_KEYWORDS.find((k) => lower.includes(k));
    if (match) {
      setStatus("rejected");
      setReason(t("booking.err_forbidden", { match }));
      return;
    }
    const contactHit = detectContact(message);
    if (contactHit) {
      setStatus("rejected");
      setReason(t("booking.err_contact", { label: contactHit.label }));
      return;
    }
    if (!accepted) {
      setStatus("rejected");
      setReason(t("booking.err_charter"));
      return;
    }
    // Validation calendrier
    if (!startDate || !endDate) {
      setStatus("rejected");
      setReason(t("booking.err_no_dates"));
      return;
    }
    if (new Date(startDate) < minStart) {
      setStatus("rejected");
      setReason(t("booking.err_date_too_soon", { min: MIN_LEAD_DAYS }));
      return;
    }
    if (daysCount < 1) {
      setStatus("rejected");
      setReason(t("booking.err_date_order"));
      return;
    }
    if (daysCount > MAX_DURATION_DAYS) {
      setStatus("rejected");
      setReason(t("booking.err_duration_max", { max: MAX_DURATION_DAYS }));
      return;
    }
    if (dailyStart < DAILY_START_MIN) {
      setStatus("rejected");
      setReason(t("booking.err_time_start_min", { min: DAILY_START_MIN }));
      return;
    }
    if (dailyEnd > DAILY_END_MAX) {
      setStatus("rejected");
      setReason(t("booking.err_time_end_max", { max: DAILY_END_MAX }));
      return;
    }
    if (dailyEnd <= dailyStart) {
      setStatus("rejected");
      setReason(t("booking.err_time_order"));
      return;
    }
    if (hoursPerDay > MAX_HOURS_PER_DAY) {
      setStatus("rejected");
      setReason(t("booking.err_hours_max", { max: MAX_HOURS_PER_DAY }));
      return;
    }
    if (hoursPerDay < MIN_HOURS_PER_DAY) {
      setStatus("rejected");
      setReason(t("booking.err_hours_min", { min: MIN_HOURS_PER_DAY }));
      return;
    }

    // Block if the advertiser has an unpaid approved campaign
    if (hasUnpaidCampaign) {
      setStatus("rejected");
      setReason(t("booking.err_unpaid"));
      return;
    }

    // Block if availability couldn't be verified (RPC failed)
    if (periodsError || periodsLoading) {
      setStatus("rejected");
      setReason(t("booking.err_avail_check"));
      return;
    }

    // Pre-check: dates already booked?
    if (bookedPeriods.length > 0) {
      const conflict = checkDateOverlap(startDate, endDate, bookedPeriods);
      if (conflict) {
        setDateConflict({
          conflictStart: conflict.start_date,
          conflictEnd: conflict.end_date,
          suggestion: nextAvailableSlot(daysCount, bookedPeriods, minStart),
        });
        return;
      }
    }
    setDateConflict(null);
    setStatus("loading");

    // Upload creative files first (resize images before upload, max 2000px)
    const uploadedPaths: string[] = [];
    if (files.length > 0) {
      const folder = `${auth.userId}/${Date.now()}`;
      for (const f of files) {
        const resized = await resizeImageFile(f, 2000, 0.87);
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${folder}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("campaign-creatives")
          .upload(path, resized, { upsert: false, contentType: resized.type });
        if (upErr) {
          setStatus("rejected");
          setReason(t("booking.err_upload", { name: f.name }));
          return;
        }
        uploadedPaths.push(path);
      }
    }

    const installerFees = await getInstallerFees().catch(() => ({
      poseFee: 2000,
      deposeFee: 2000,
    }));

    const { data: created, error } = await supabase
      .from("campaign_requests")
      .insert({
        user_id: auth.userId,
        spot_id: String(spot.id),
        vehicle_id: spot.vehicleId ?? null,
        spot_name: spot.name,
        spot_location: spot.location,
        spot_price: spot.price,
        company: auth.profile.company ?? auth.profile.full_name,
        email: auth.profile.email,
        message,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        total_price: totalPrice,
        daily_start_time: dailyStart,
        daily_end_time: dailyEnd,
        country_code: selectedCountry.code as never,
        timezone: selectedCountry.timezone as never,
        route_zones: itinerary.zones.slice(0, 50),
        route_waypoints: itinerary.waypoints.slice(0, 50),
        route_pois: itinerary.pois.slice(0, 50),
        estimated_impressions_per_day: itinerary.impressionsPerDay || suggestedImpressions || null,
        creative_files: uploadedPaths,
        pose_fee_cents: installerFees.poseFee,
        depose_fee_cents: installerFees.deposeFee,
        pose_location_type: poseLocationType ?? null,
        installation_address: installationAddress.trim() || null,
      })
      .select("id, status, admin_notes")
      .single();

    if (error) {
      setStatus("rejected");
      setReason(t("booking.err_send"));
      return;
    }

    // TOCTOU: dates were grabbed by someone else between our pre-check and our insert
    if (created?.status === "rejected" && created.admin_notes?.includes("réservé")) {
      setStatus("idle");
      if (spot.vehicleId) {
        // Refresh booked periods via RPC so the calendar immediately shows the new blocker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .rpc("get_vehicle_booked_periods", { p_vehicle_id: spot.vehicleId })
          .then(
            ({ data: fresh, error: rpcErr }: { data: BookedPeriod[] | null; error: unknown }) => {
              if (rpcErr || !fresh) {
                setStatus("rejected");
                setReason(t("booking.err_conflict_refresh"));
                return;
              }
              const freshPeriods = fresh as BookedPeriod[];
              setBookedPeriods(freshPeriods);
              const conflict = checkDateOverlap(startDate, endDate, freshPeriods);
              setDateConflict({
                conflictStart: conflict?.start_date ?? startDate,
                conflictEnd: conflict?.end_date ?? endDate,
                suggestion: nextAvailableSlot(daysCount, freshPeriods, minStart),
              });
            },
          )
          .catch(() => {
            setStatus("rejected");
            setReason(t("booking.err_conflict_choose"));
          });
      } else {
        setStatus("rejected");
        setReason(t("booking.err_conflict_choose"));
      }
      return;
    }

    setStatus("success");
    if (created?.id) {
      setCampaignId(created.id);
      notifyFn({ data: { campaignId: created.id } }).catch(() => {});
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const merged = [...files, ...list].slice(0, MAX_FILES);
    const filtered: File[] = [];
    for (const f of merged) {
      const isVid = f.type.startsWith("video/");
      const max = isVid ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (f.size > max) {
        setStatus("rejected");
        setReason(t("booking.err_size", { name: f.name, max: isVid ? "200" : "50" }));
        continue;
      }
      filtered.push(f);
    }
    setFiles(filtered);
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-elevated max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {auth.kind === "loading" ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {t("booking.loading")}
          </div>
        ) : auth.kind === "anon" ? (
          <div className="text-center py-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {t("booking.login_required")}
            </div>
            <h3 className="font-display text-2xl font-bold mb-3">
              {t("booking.book_spot", { name: spot.name })}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">{t("booking.anon_desc")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={goSignIn}
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition"
              >
                {t("booking.signin_btn")}
              </button>
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("booking.cancel")}
              </button>
            </div>
          </div>
        ) : auth.kind === "no-profile" ? (
          <div className="text-center py-6">
            <h3 className="font-display text-2xl font-bold mb-3">
              {t("booking.incomplete_profile")}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t("booking.complete_profile_desc")}
            </p>
            <button
              onClick={goSignIn}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition"
            >
              {t("booking.complete_profile_btn")}
            </button>
          </div>
        ) : status === "success" ? (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-signal/20 flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-signal"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">{t("booking.success_title")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("booking.success_desc", { name: spot.name })}
            </p>
            <div className="rounded-lg bg-secondary/40 border border-border p-3 text-left text-xs text-muted-foreground mb-6 space-y-1.5">
              <div>{t("booking.success_step1")}</div>
              <div>{t("booking.success_step2")}</div>
              <div>{t("booking.success_step3")}</div>
            </div>
            <div className="flex flex-col gap-2">
              {campaignId ? (
                <button
                  onClick={() =>
                    navigate({ to: "/advertiser/suivi/$campaignId", params: { campaignId } })
                  }
                  className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium"
                >
                  {t("booking.track_campaign")}
                </button>
              ) : (
                <button
                  onClick={() => navigate({ to: "/advertiser" })}
                  className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium"
                >
                  {t("booking.see_campaigns")}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("booking.close")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {t("booking.reservation_eyebrow")}
                </div>
                <h3 className="font-display text-2xl font-bold">{spot.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {spot.location} · {fmtAmount(spot.price)}/jour
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="rounded-lg bg-secondary/40 border border-border p-3 mb-4 text-xs text-muted-foreground">
              {t("booking.connected_as", { name: auth.profile.full_name })}
              {auth.profile.company ? ` (${auth.profile.company})` : ""} · {auth.profile.email}
            </div>

            {hasUnpaidCampaign && (
              <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 mb-4 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{t("booking.unpaid_warning")}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("booking.msg_label")}</label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setStatus("idle");
                  }}
                  rows={4}
                  required
                  maxLength={500}
                  placeholder={t("booking.msg_placeholder")}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="text-xs text-muted-foreground mt-1">{message.length}/500</div>
                {detectContact(message) && (
                  <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    🚫 {t("booking.contact_detected", { label: detectContact(message)!.label })}
                  </div>
                )}
              </div>

              {/* Aperçu publicitaire sur les photos réelles du véhicule */}
              <div className="rounded-lg border border-border bg-secondary/10 p-4 space-y-3">
                <div className="text-sm font-semibold">{t("booking.ad_preview_title")}</div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium">{t("booking.brand_color")}</label>
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-card"
                    />
                    <span className="text-xs text-muted-foreground font-mono">{brandColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium">{t("booking.logo_optional")}</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setLogoUrl(URL.createObjectURL(file));
                      }}
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="text-xs text-destructive"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {spot.vehicleId ? (
                  <VehiclePhotoAdPreview
                    vehicleId={spot.vehicleId}
                    brandColor={brandColor}
                    logoUrl={logoUrl}
                    videoFile={
                      SCREEN_VEHICLE_TYPES.includes(spot.vehicleType ?? "")
                        ? (files.find((f) => f.type.startsWith("video/")) ?? null)
                        : null
                    }
                  />
                ) : (
                  <div className="h-32 rounded-xl bg-secondary/40 flex items-center justify-center text-xs text-muted-foreground">
                    {t("booking.preview_unavailable")}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t("booking.country_label")}
                </label>
                <select
                  value={countryKey}
                  onChange={(e) => setCountryKey(e.target.value)}
                  className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("booking.country_hint")}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{t("booking.period_title")}</div>
                  {periodsLoading && (
                    <span className="text-[11px] text-muted-foreground animate-pulse">
                      {t("booking.avail_loading")}
                    </span>
                  )}
                  {periodsError && (
                    <span className="text-[11px] text-destructive font-medium">
                      {t("booking.avail_error")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Calendar
                    mode="range"
                    locale={fr}
                    selected={calRange}
                    onSelect={handleRangeSelect}
                    disabled={{ before: minStart }}
                    modifiers={{ booked: bookedModifiers }}
                    components={{ DayButton: BookingDayButton }}
                    numberOfMonths={1}
                    className="rounded-lg border border-border self-center"
                  />
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground self-start">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
                      {t("booking.cal_selected")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-red-200 dark:bg-red-900" />
                      {t("booking.cal_booked")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-muted opacity-50" />
                      {t("booking.cal_unavailable")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      {t("booking.daily_start_label")}
                    </label>
                    <input
                      type="time"
                      value={dailyStart}
                      min={DAILY_START_MIN}
                      max={DAILY_END_MAX}
                      onChange={(e) => {
                        setDailyStart(e.target.value);
                        setStatus("idle");
                      }}
                      className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      {t("booking.daily_end_label")}
                    </label>
                    <input
                      type="time"
                      value={dailyEnd}
                      min={DAILY_START_MIN}
                      max={DAILY_END_MAX}
                      onChange={(e) => {
                        setDailyEnd(e.target.value);
                        setStatus("idle");
                      }}
                      className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {daysCount > 0 && (
                  <div className="rounded-md bg-primary/10 text-primary px-3 py-2 text-xs flex flex-wrap items-baseline gap-x-3">
                    <span>
                      <strong>{daysCount}</strong> {t("booking.days_label", { count: daysCount })} ·{" "}
                      <strong>{hoursPerDay.toFixed(1)}h</strong>
                      {t("booking.per_day_label")}
                    </span>
                    <span className="opacity-80">·</span>
                    <span>
                      {t("booking.total_label")} <strong>{fmtAmount(totalPrice)}</strong>
                    </span>
                  </div>
                )}
                {daysCount > 6 && (
                  <div className="rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    {t("booking.weekly_rest_warning", {
                      weeks: Math.floor(daysCount / 7),
                      s: Math.floor(daysCount / 7) > 1 ? "s" : "",
                    })}
                  </div>
                )}
                {/* Conflict banner */}
                {dateConflict && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="text-sm font-semibold text-destructive">
                          {t("booking.conflict_title", {
                            start: fmtDate(dateConflict.conflictStart),
                            end: fmtDate(dateConflict.conflictEnd),
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("booking.conflict_hint")}
                        </p>
                      </div>
                    </div>
                    {dateConflict.suggestion && (
                      <div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5">
                          {t("booking.first_slot")}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const s = dateConflict.suggestion!.start;
                            const e = dateConflict.suggestion!.end;
                            setStartDate(s);
                            setEndDate(e);
                            setCalRange({
                              from: new Date(s + "T00:00:00"),
                              to: new Date(e + "T00:00:00"),
                            });
                            setDateConflict(null);
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-amber-400 bg-white dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          <span>
                            {fmtDate(dateConflict.suggestion.start)} →{" "}
                            {fmtDate(dateConflict.suggestion.end)}
                            {daysCount > 0 && (
                              <span className="ml-1.5 text-xs opacity-70">
                                ({daysCount} jour{daysCount > 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {t("booking.choose")}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {t("booking.booking_constraints", { min: MIN_LEAD_DAYS, max: MAX_DURATION_DAYS })}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {t("booking.time_window", {
                    start: DAILY_START_MIN,
                    end: DAILY_END_MAX,
                    hours: MAX_HOURS_PER_DAY,
                  })}
                </p>
              </div>

              <ItineraryPlanner
                multiplier={formatMultiplier * mobilityMultiplier * hoursMultiplier}
                onChange={setItinerary}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("booking.itinerary_hint")}
                {suggestedImpressions && itinerary.impressionsPerDay === 0
                  ? t("booking.itinerary_fallback", {
                      n: suggestedImpressions.toLocaleString(i18n.language),
                    })
                  : ""}
              </p>

              {SCREEN_VEHICLE_TYPES.includes(spot.vehicleType ?? "") && (
                <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-4 text-sm space-y-1">
                  <div className="font-semibold text-indigo-300">
                    {t("booking.screen_vehicle_title")}
                  </div>
                  <p className="text-xs text-indigo-200/80">{t("booking.screen_vehicle_desc")}</p>
                  <p className="text-xs text-indigo-200/60">{t("booking.screen_vehicle_format")}</p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {SCREEN_VEHICLE_TYPES.includes(spot.vehicleType ?? "")
                      ? t("booking.video_label")
                      : t("booking.crea_label")}{" "}
                    <span className="text-muted-foreground font-normal">
                      {SCREEN_VEHICLE_TYPES.includes(spot.vehicleType ?? "")
                        ? t("booking.video_required")
                        : t("booking.crea_optional")}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {files.length}/{MAX_FILES}
                  </span>
                </div>
                <input
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={handleFilesChange}
                  disabled={files.length >= MAX_FILES}
                  className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer file:text-xs hover:file:bg-primary/90 disabled:opacity-50"
                />
                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs bg-background rounded-md px-2 py-1.5 border border-border"
                      >
                        <span className="truncate">
                          {f.type.startsWith("video/")
                            ? "🎬"
                            : f.type === "application/pdf"
                              ? "📄"
                              : "🖼"}{" "}
                          {f.name}
                          <span className="text-muted-foreground ml-1">
                            ({(f.size / 1024 / 1024).toFixed(1)} Mo)
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          aria-label={t("booking.remove_file")}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {t("booking.files_hint", { max: MAX_FILES })}
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground border border-border">
                <div className="font-semibold text-foreground mb-2">
                  {t("booking.forbidden_title")}
                </div>
                <p>{t("booking.forbidden_desc")}</p>
              </div>

              {/* Lieu de pose : garage ou domicile */}
              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="text-sm font-semibold">{t("booking.pose_location_title")}</div>
                <p className="text-xs text-muted-foreground">{t("booking.pose_location_desc")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["garage", "domicile"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPoseLocationType(poseLocationType === type ? null : type)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        poseLocationType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {type === "garage" ? "🏪" : "🏠"} {t(`booking.pose_type_${type}`)}
                    </button>
                  ))}
                </div>
                {poseLocationType && (
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      {t("booking.installation_address_label")}
                    </label>
                    <input
                      type="text"
                      value={installationAddress}
                      onChange={(e) => setInstallationAddress(e.target.value)}
                      placeholder={t("booking.installation_address_placeholder")}
                      maxLength={255}
                      className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("booking.installation_address_hint")}
                    </p>
                  </div>
                )}
              </div>

              <ValidationChecklist />

              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    setStatus("idle");
                  }}
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span className="text-muted-foreground">{t("booking.accept_label")}</span>
              </label>

              {status === "rejected" && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-4 text-sm text-destructive">
                  {reason}
                </div>
              )}

              <div className="rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                {t("booking.offplatform_warning")}
              </div>

              <button
                type="submit"
                disabled={
                  status === "loading" ||
                  !accepted ||
                  !!dateConflict ||
                  periodsLoading ||
                  periodsError
                }
                className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "loading" ? t("booking.submitting") : t("booking.submit_btn")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ValidationChecklist() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const items = [
    { ok: true, label: t("booking.checklist_1") },
    { ok: true, label: t("booking.checklist_2") },
    { ok: true, label: t("booking.checklist_3") },
    { ok: true, label: t("booking.checklist_4") },
    { ok: true, label: t("booking.checklist_5") },
    { ok: true, label: t("booking.checklist_6") },
  ];
  return (
    <div className="rounded-lg border border-border bg-secondary/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left"
      >
        <span>{t("booking.checklist_title")}</span>
        <span className="text-muted-foreground text-xs">
          {open ? t("booking.checklist_hide") : t("booking.checklist_show")}
        </span>
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-signal mt-0.5 shrink-0">✓</span>
              {item.label}
            </li>
          ))}
          <li className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
            {t("booking.checklist_review")}
          </li>
        </ul>
      )}
    </div>
  );
}
