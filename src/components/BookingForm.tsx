import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Spot } from "./AdSpots";
import { supabase } from "@/integrations/supabase/client";
import { FORBIDDEN_KEYWORDS } from "@/lib/forbidden-keywords";
import { ItineraryPlanner, type ItineraryData } from "./ItineraryPlanner";
import { getVehicleBookedPeriods } from "@/lib/public-campaign.functions";
import type { DateRange } from "react-day-picker";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";

type BookedPeriod = { start_date: string; end_date: string };
type DateConflict = {
  conflictStart: string;
  conflictEnd: string;
  suggestion: { start: string; end: string } | null;
};

function checkDateOverlap(start: string, end: string, periods: BookedPeriod[]): BookedPeriod | null {
  return periods.find((p) => p.start_date <= end && p.end_date >= start) ?? null;
}

function nextAvailableSlot(days: number, periods: BookedPeriod[], earliest: Date): { start: string; end: string } {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
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

function BookingDayButton({ modifiers, onClick, className, ...props }: React.ComponentProps<typeof CalendarDayButton>) {
  const isBooked = !!modifiers?.booked;
  return (
    <CalendarDayButton
      modifiers={modifiers}
      onClick={isBooked ? (e) => { e.preventDefault(); e.stopPropagation(); } : onClick}
      className={cn(
        className,
        isBooked && "!bg-red-100 dark:!bg-red-950/40 !text-red-600 dark:!text-red-400 line-through !cursor-not-allowed hover:!bg-red-100 dark:hover:!bg-red-950/40",
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
  | { kind: "ready"; userId: string; profile: { full_name: string; company: string | null; email: string } };

export function BookingForm({ spot, onClose }: Props) {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [message, setMessage] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryData>({
    waypoints: [], zones: [], pois: [], distanceKm: 0, impressionsPerDay: 0,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "rejected" | "success" | "loading">("idle");
  const [reason, setReason] = useState("");
  const [bookedPeriods, setBookedPeriods] = useState<BookedPeriod[]>([]);
  const [dateConflict, setDateConflict] = useState<DateConflict | null>(null);

  // Calendrier de réservation : min 3 jours d'avance, durée 1 à 30 jours
  const MIN_LEAD_DAYS = 3;
  const MAX_DURATION_DAYS = 30;
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minStart = new Date(today); minStart.setDate(minStart.getDate() + MIN_LEAD_DAYS);
  const defaultStart = new Date(minStart);
  const defaultEnd = new Date(minStart); defaultEnd.setDate(defaultEnd.getDate() + 6); // 7 jours
  const [startDate, setStartDate] = useState<string>(toISO(defaultStart));
  const [endDate, setEndDate] = useState<string>(toISO(defaultEnd));

  // Plage horaire de diffusion (par défaut 08:00 → 20:00, soit 12h)
  const [dailyStart, setDailyStart] = useState<string>("08:00");
  const [dailyEnd, setDailyEnd] = useState<string>("20:00");

  const daysCount = (() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate); const e = new Date(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  })();

  const totalPrice = spot ? daysCount * spot.price : 0;

  const bookedModifiers = bookedPeriods.map((p) => ({
    from: new Date(p.start_date + "T00:00:00"),
    to: new Date(p.end_date + "T00:00:00"),
  }));
  const calRange: DateRange | undefined = startDate
    ? { from: new Date(startDate + "T00:00:00"), to: endDate ? new Date(endDate + "T00:00:00") : undefined }
    : undefined;

  const MAX_FILES = 5;
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
  const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime";

  // Estimation impressions/jour = km/jour × 1000 × coef format × coef mobilité × coef plage horaire
  const formatMultiplier = (() => {
    const f = (spot?.format ?? "").toLowerCase();
    if (f.includes("lcd") || f.includes("écran") || f.includes("ecran") || f.includes("digital")) return 1.4;
    if (f.includes("toit") || f.includes("totem")) return 1.2;
    if (f.includes("affiche") || f.includes("sticker") || f.includes("covering")) return 1.0;
    return 1.0;
  })();
  const mobilityMultiplier = (() => {
    const t = (spot?.vehicleType ?? "").toLowerCase();
    if (t === "taxi" || t === "vtc") return 1.3;          // forte rotation urbaine
    if (t === "food_truck") return 1.1;                    // stationne en lieux passants
    if (t === "scooter") return 0.9;                       // visibilité plus courte
    if (t === "van" || t === "voiture") return 1.0;
    return 1.0;
  })();
  const hoursPerDay = (() => {
    const [sh, sm] = dailyStart.split(":").map(Number);
    const [eh, em] = dailyEnd.split(":").map(Number);
    const h = (eh + em / 60) - (sh + sm / 60);
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
      if (!data.session) { setAuth({ kind: "anon" }); return; }
      const userId = data.session.user.id;
      const email = data.session.user.email ?? "";
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("full_name, company")
        .eq("user_id", userId)
        .maybeSingle();
      if (!prof) { setAuth({ kind: "no-profile", userId, email }); return; }
      setAuth({ kind: "ready", userId, profile: { full_name: prof.full_name, company: prof.company, email } });
    })();
  }, [spot]);

  // Load already-booked date ranges for this vehicle
  useEffect(() => {
    if (!spot?.vehicleId) { setBookedPeriods([]); return; }
    getVehicleBookedPeriods({ data: { vehicleId: spot.vehicleId } })
      .then(setBookedPeriods)
      .catch(() => setBookedPeriods([]));
  }, [spot?.vehicleId]);

  if (!spot) return null;

  const goSignIn = () => {
    onClose();
    navigate({ to: "/annonceur/inscription", search: { redirect: window.location.pathname + "#spots" } });
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateConflict(null);
    setStatus("idle");
    if (!range?.from) return;
    const fromISO = toISO(range.from);
    const endISO = range.to ? toISO(range.to) : fromISO;
    const days = range.to ? Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1 : 1;
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
      setReason(`Contenu interdit détecté : « ${match} ». Les publicités religieuses, sexistes, pornographiques ou incitant à la violence ne sont pas acceptées.`);
      return;
    }
    if (!accepted) {
      setStatus("rejected");
      setReason("Vous devez accepter la charte de contenu.");
      return;
    }
    // Validation calendrier
    if (!startDate || !endDate) {
      setStatus("rejected");
      setReason("Veuillez choisir une date de début et une date de fin.");
      return;
    }
    if (new Date(startDate) < minStart) {
      setStatus("rejected");
      setReason(`La date de début doit être au moins ${MIN_LEAD_DAYS} jours après aujourd'hui (le temps de valider la campagne).`);
      return;
    }
    if (daysCount < 1) {
      setStatus("rejected");
      setReason("La date de fin doit être postérieure ou égale à la date de début.");
      return;
    }
    if (daysCount > MAX_DURATION_DAYS) {
      setStatus("rejected");
      setReason(`La durée maximale d'une campagne est de ${MAX_DURATION_DAYS} jours.`);
      return;
    }
    if (dailyEnd <= dailyStart) {
      setStatus("rejected");
      setReason("L'heure de fin de diffusion doit être après l'heure de début.");
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

    // Upload creative files first
    const uploadedPaths: string[] = [];
    if (files.length > 0) {
      const folder = `${auth.userId}/${Date.now()}`;
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${folder}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("campaign-creatives")
          .upload(path, f, { upsert: false, contentType: f.type });
        if (upErr) {
          setStatus("rejected");
          setReason(`Erreur lors de l'upload de « ${f.name} ». Réessayez.`);
          return;
        }
        uploadedPaths.push(path);
      }
    }

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
        route_zones: itinerary.zones.slice(0, 50),
        route_waypoints: itinerary.waypoints.slice(0, 50),
        route_pois: itinerary.pois.slice(0, 50),
        estimated_impressions_per_day: itinerary.impressionsPerDay || suggestedImpressions || null,
        creative_files: uploadedPaths,
      })
      .select("id, status, admin_notes")
      .single();

    if (error) {
      setStatus("rejected");
      setReason("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }

    // TOCTOU: dates were grabbed by someone else between our pre-check and our insert
    if (created?.status === "rejected" && created.admin_notes?.includes("réservé")) {
      setStatus("idle");
      if (spot.vehicleId) {
        // Refresh booked periods so the UI shows the new blocker
        getVehicleBookedPeriods({ data: { vehicleId: spot.vehicleId } })
          .then((fresh) => {
            setBookedPeriods(fresh);
            const conflict = checkDateOverlap(startDate, endDate, fresh);
            setDateConflict({
              conflictStart: conflict?.start_date ?? startDate,
              conflictEnd: conflict?.end_date ?? endDate,
              suggestion: nextAvailableSlot(daysCount, fresh, minStart),
            });
          })
          .catch(() => {
            setStatus("rejected");
            setReason("Ces dates viennent d'être réservées. Choisissez d'autres dates.");
          });
      } else {
        setStatus("rejected");
        setReason("Ces dates viennent d'être réservées. Choisissez d'autres dates.");
      }
      return;
    }

    setStatus("success");
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
        setReason(`« ${f.name} » dépasse la taille max (${isVid ? "200" : "50"} Mo).`);
        continue;
      }
      filtered.push(f);
    }
    setFiles(filtered);
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-elevated max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {auth.kind === "loading" ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : auth.kind === "anon" ? (
          <div className="text-center py-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Connexion requise</div>
            <h3 className="font-display text-2xl font-bold mb-3">Réservez {spot.name}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Pour soumettre une campagne, vous devez créer un compte annonceur (ou vous connecter). Cela nous permet de suivre vos demandes et de protéger les propriétaires.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={goSignIn} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition">
                Créer un compte / Se connecter
              </button>
              <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Annuler</button>
            </div>
          </div>
        ) : auth.kind === "no-profile" ? (
          <div className="text-center py-6">
            <h3 className="font-display text-2xl font-bold mb-3">Profil incomplet</h3>
            <p className="text-sm text-muted-foreground mb-6">Finalisez votre profil annonceur pour continuer.</p>
            <button onClick={goSignIn} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition">
              Compléter mon profil
            </button>
          </div>
        ) : status === "success" ? (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-signal/20 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">Demande envoyée</h3>
            <p className="text-muted-foreground mb-4">Votre campagne pour <strong>{spot.name}</strong> est en cours de validation.</p>
            <div className="rounded-lg bg-secondary/40 border border-border p-3 text-left text-xs text-muted-foreground mb-6 space-y-1.5">
              <div>⏱ <strong className="text-foreground">Réponse immédiate</strong> : si le véhicule est libre sur vos dates, la campagne est validée automatiquement.</div>
              <div>❌ En cas de refus (dates indisponibles, véhicule non approuvé, contenu non conforme), le motif s'affiche immédiatement dans votre espace annonceur.</div>
              <div>📩 Le propriétaire est notifié et peut vous contacter sous <strong className="text-foreground">48 h</strong> pour préciser l'itinéraire.</div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate({ to: "/annonceur" })} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">Voir mes campagnes</button>
              <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Fermer</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Réservation</div>
                <h3 className="font-display text-2xl font-bold">{spot.name}</h3>
                <p className="text-sm text-muted-foreground">{spot.location} · {spot.price}€/jour</p>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>

            <div className="rounded-lg bg-secondary/40 border border-border p-3 mb-4 text-xs text-muted-foreground">
              Connecté en tant que <strong className="text-foreground">{auth.profile.full_name}</strong>
              {auth.profile.company ? ` (${auth.profile.company})` : ""} · {auth.profile.email}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Message de la campagne</label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setStatus("idle"); }}
                  rows={4}
                  required
                  maxLength={500}
                  placeholder="Décrivez le contenu de votre publicité..."
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="text-xs text-muted-foreground mt-1">{message.length}/500</div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="text-sm font-semibold">📅 Période de diffusion</div>
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
                      Sélectionnée
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-red-200 dark:bg-red-900" />
                      Réservée
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-muted opacity-50" />
                      Non disponible
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Heure de début (par jour)</label>
                    <input
                      type="time"
                      value={dailyStart}
                      onChange={(e) => { setDailyStart(e.target.value); setStatus("idle"); }}
                      className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Heure de fin (par jour)</label>
                    <input
                      type="time"
                      value={dailyEnd}
                      onChange={(e) => { setDailyEnd(e.target.value); setStatus("idle"); }}
                      className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {daysCount > 0 && (
                  <div className="rounded-md bg-primary/10 text-primary px-3 py-2 text-xs flex flex-wrap items-baseline gap-x-3">
                    <span><strong>{daysCount}</strong> jour{daysCount > 1 ? "s" : ""} · <strong>{hoursPerDay.toFixed(1)}h</strong>/jour</span>
                    <span className="opacity-80">·</span>
                    <span>Total estimé : <strong>{totalPrice.toLocaleString("fr-FR")} €</strong></span>
                  </div>
                )}
                {/* Conflict banner */}
                {dateConflict && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Ces dates sont déjà réservées
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          Ce véhicule est déjà occupé du{" "}
                          <strong>{fmtDate(dateConflict.conflictStart)}</strong> au{" "}
                          <strong>{fmtDate(dateConflict.conflictEnd)}</strong>.
                          Votre message et vos visuels sont conservés — seules les dates doivent changer.
                        </p>
                      </div>
                    </div>
                    {dateConflict.suggestion && (
                      <div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5">
                          Première disponibilité suggérée :
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setStartDate(dateConflict.suggestion!.start);
                            setEndDate(dateConflict.suggestion!.end);
                            setDateConflict(null);
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-amber-400 bg-white dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          <span>
                            {fmtDate(dateConflict.suggestion.start)}{" "}→{" "}
                            {fmtDate(dateConflict.suggestion.end)}
                            {daysCount > 0 && (
                              <span className="ml-1.5 text-xs opacity-70">({daysCount} jour{daysCount > 1 ? "s" : ""})</span>
                            )}
                          </span>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Choisir →</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Réservation possible à partir de <strong>{MIN_LEAD_DAYS} jours</strong> et jusqu'à <strong>{MAX_DURATION_DAYS} jours</strong> consécutifs. Les dates passées ou déjà réservées sont automatiquement refusées.
                </p>
              </div>


              <ItineraryPlanner
                multiplier={formatMultiplier * mobilityMultiplier * hoursMultiplier}
                onChange={setItinerary}
              />
              <p className="text-[11px] text-muted-foreground">
                Le propriétaire utilisera ces indications pour planifier la tournée. La validation reste automatique si les dates et le véhicule sont libres.
                {suggestedImpressions && itinerary.impressionsPerDay === 0
                  ? ` À défaut d'itinéraire, l'estimation du véhicule est utilisée (${suggestedImpressions.toLocaleString("fr-FR")} vues/jour).`
                  : ""}
              </p>


              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">Fichiers de la créa <span className="text-muted-foreground font-normal">(optionnel)</span></div>
                  <span className="text-[11px] text-muted-foreground">{files.length}/{MAX_FILES}</span>
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
                      <li key={i} className="flex items-center justify-between gap-2 text-xs bg-background rounded-md px-2 py-1.5 border border-border">
                        <span className="truncate">
                          {f.type.startsWith("video/") ? "🎬" : f.type === "application/pdf" ? "📄" : "🖼"} {f.name}
                          <span className="text-muted-foreground ml-1">({(f.size / 1024 / 1024).toFixed(1)} Mo)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          aria-label="Retirer"
                        >×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, WebP, PDF (max 50 Mo) · MP4, MOV (max 200 Mo) · {MAX_FILES} fichiers max. Les fichiers ne sont visibles que par vous, le propriétaire du véhicule et MoveSpot.
                </p>
              </div>


              <div className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground border border-border">
                <div className="font-semibold text-foreground mb-2">⚠ Contenus refusés</div>
                <p>Publicités à caractère religieux ou fêtes religieuses, politique ou électoral, sexistes, pornographiques ou incitant à la violence.</p>
              </div>


              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => { setAccepted(e.target.checked); setStatus("idle"); }}
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span className="text-muted-foreground">J'accepte la charte de contenu et confirme que ma publicité respecte ces règles.</span>
              </label>

              {status === "rejected" && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-4 text-sm text-destructive">
                  {reason}
                </div>
              )}

              <button type="submit" disabled={status === "loading"} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {status === "loading" ? "Envoi..." : "Soumettre la campagne"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
