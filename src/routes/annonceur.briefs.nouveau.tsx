import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { findForbiddenKeyword } from "@/lib/campaigns/forbidden-keywords";
import { ZonePolygonDraw, polygonToEwkt, type ZonePolygon } from "@/components/advertiser/ZonePolygonDraw";
import { estimateZoneBudget } from "@/lib/geo/zone-budget";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { AD_FORMATS, BOXLED_INCOMPATIBLE, CAMION_LED_SPEC, isFormatIncompatible, type AdFormat, type VehicleKey } from "@/components/advertiser/VehicleMockup3D";

const VehicleMockup3D = lazy(() =>
  import("@/components/advertiser/VehicleMockup3D").then((m) => ({ default: m.VehicleMockup3D }))
);

const CamionLED3DPreview = lazy(() =>
  import("@/components/advertiser/CamionLED3DPreview").then((m) => ({ default: m.CamionLED3DPreview }))
);

export const Route = createFileRoute("/annonceur/briefs/nouveau")({
  head: () => ({
    meta: [
      { title: "Nouveau brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewBriefPage,
});

const VEHICLE_TYPES: { v: string; l: string; tip?: string }[] = [
  {
    v: "camion_led",
    l: "📺 Camion LED",
    tip: `${CAMION_LED_SPEC.name} — ${CAMION_LED_SPEC.vehicleClass}\n` +
         `Écrans : ${CAMION_LED_SPEC.screens.activeFaces.join(", ")} · ${CAMION_LED_SPEC.screens.type}\n` +
         `Résolution : faces ${CAMION_LED_SPEC.screens.resolution.side} · arrière ${CAMION_LED_SPEC.screens.resolution.rear}`,
  },
  { v: "food_truck", l: "Food truck" },
  { v: "van", l: "Van utilitaire" },
  { v: "taxi", l: "Taxi / VTC" },
  { v: "scooter", l: "Scooter livraison" },
  { v: "velo_cargo", l: "Vélo cargo" },
  { v: "velo_remorque", l: "Vélo remorque" },
  { v: "triporteur", l: "Triporteur" },
  { v: "tutuk", l: "Tutuk" },
  { v: "voiture", l: "Voiture" },
  { v: "autre", l: "Autre" },
];

function NewBriefPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [zones, setZones] = useState("");
  const [zoneSearchQuery, setZoneSearchQuery] = useState("");
  const [zonePolygon, setZonePolygon] = useState<ZonePolygon | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [audience, setAudience] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [autreVehicleNote, setAutreVehicleNote] = useState("");
  const [adFormat, setAdFormat] = useState<AdFormat | null>(null);
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [screenVideoUrl, setScreenVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("user_id")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) { navigate({ to: "/annonceur/inscription" }); return; }
      setUserId(sess.session.user.id);
    })();
  }, [navigate]);

  const estimatedDays =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
      : 0;

  const toggleType = (v: string) => {
    setVehicleTypes((cur) => {
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (v === "camion_led" && !cur.includes("camion_led")) {
        // Camion LED → format boxled automatique (seul format de série compatible)
        setAdFormat("boxled");
      } else if (adFormat === "boxled" && isFormatIncompatible(next, "boxled")) {
        // Un véhicule incompatible ajouté alors que boxled est actif → on réinitialise le format
        setAdFormat(null);
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userId) return;
    if (vehicleTypes.length === 0) { setError("Sélectionnez au moins un type de véhicule."); return; }
    if (vehicleTypes.includes("autre") && !autreVehicleNote.trim()) {
      setError("Vous avez sélectionné « Autre » : veuillez préciser le type de véhicule recherché.");
      return;
    }
    if (!startDate || !endDate) { setError("Dates obligatoires."); return; }
    if (endDate < startDate) { setError("La date de fin doit être après la date de début."); return; }
    const forbidden = findForbiddenKeyword(`${title} ${description} ${audience}`);
    if (forbidden) {
      setError(`Contenu interdit détecté : « ${forbidden} ». Charte MoveSpot : pas de campagne religieuse, politique/électorale, sexiste, pornographique, violente, ni d'anniversaire personnel.`);
      return;
    }
    setLoading(true);

    // Upload creatives
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/briefs/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("campaign-creatives")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) { setError(`Upload échoué : ${f.name}`); setLoading(false); return; }
      uploadedPaths.push(path);
    }

    const zoneList = zones.split(/\r?\n|,/).map((z) => z.trim()).filter(Boolean).slice(0, 30);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const finalDescription = vehicleTypes.includes("autre") && autreVehicleNote.trim()
      ? `${description}\n\n[Véhicule autre recherché : ${autreVehicleNote.trim()}]`
      : description;

    const { data, error: insErr } = await supabase.from("advertiser_briefs").insert([{
      advertiser_id: userId,
      title,
      description: finalDescription,
      vehicle_types: vehicleTypes as never,
      zones: zoneList,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      budget_max: budget ? Number(budget) : null,
      audience_target: audience || null,
      creative_files: uploadedPaths,
      zone_polygon: zonePolygon ? (polygonToEwkt(zonePolygon.coordinates) as never) : null,
      zone_area_km2: zonePolygon?.areaKm2 ?? null,
      ad_format: adFormat ?? null,
    }]).select("id").single();

    setLoading(false);
    if (insErr) { setError(insErr.message); return; }

    // Budget calculé depuis la zone dessinée → tunnel de paiement Stripe
    const computed = zonePolygon
      ? estimateZoneBudget(zonePolygon.areaKm2, days, 1, zonePolygon.coordinates as [number, number][]).total
      : 0;
    if (computed > 0) {
      setCreated({ id: data!.id, amount: Math.max(10, Math.round(computed)) });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate({ to: "/annonceur/briefs/$briefId", params: { briefId: data!.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        {created && (
          <div className="mb-8 rounded-2xl border border-primary/40 bg-primary/5 p-6">
            <h2 className="font-display text-2xl font-bold">Récapitulatif du devis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Brief enregistré. Montant calculé d'après la zone dessinée et la durée de campagne :{" "}
              <strong className="text-foreground">{created.amount.toLocaleString("fr-FR")} €</strong>{" "}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WalletTopupCheckout
                amountEuros={created.amount}
                campaignBriefId={created.id}
                buttonLabel="Valider et Payer la Campagne"
              />
              <Link
                to="/annonceur/briefs/$briefId"
                params={{ briefId: created.id }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Payer plus tard → voir le brief
              </Link>
            </div>
          </div>
        )}

        <h1 className="font-display text-3xl font-bold mb-2">Publier un brief</h1>
        <p className="text-sm text-muted-foreground mb-6">Décrivez votre besoin. Les propriétaires éligibles pourront vous proposer leurs véhicules.</p>

        {/* Bandeau découverte Camion LED */}
        <div className="mb-8 rounded-xl border border-blue-500/30 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(10,20,60,0.95), rgba(5,10,35,0.98))" }}>
          <div className="flex items-start gap-4 p-4">
            {/* Mini silhouette SVG BoxLED */}
            <div className="shrink-0 w-16 h-10 relative" style={{ filter: "drop-shadow(0 0 6px rgba(40,120,255,0.5))" }}>
              <svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Caisse LED */}
                <rect x="22" y="2" width="40" height="28" rx="1" fill="#0a1840" stroke="#1e40af" strokeWidth="0.8"/>
                <rect x="24" y="4" width="36" height="24" rx="0.5" fill="#1d4ed8" opacity="0.3"/>
                <text x="42" y="19" textAnchor="middle" fill="rgba(147,197,253,0.9)" fontSize="7" fontWeight="bold">LED</text>
                {/* Cabine */}
                <rect x="2" y="10" width="20" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.8"/>
                <rect x="4" y="12" width="16" height="8" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
                {/* Roues */}
                <circle cx="12" cy="34" r="4" fill="#1e293b" stroke="#475569" strokeWidth="0.8"/>
                <circle cx="48" cy="34" r="4" fill="#1e293b" stroke="#475569" strokeWidth="0.8"/>
                <circle cx="56" cy="34" r="4" fill="#1e293b" stroke="#475569" strokeWidth="0.8"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-300 font-bold text-sm">📺 Camion LED publicitaire</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(37,99,235,0.3)", color: "rgba(147,197,253,0.95)" }}>NOUVEAU</span>
              </div>
              <p className="text-xs text-blue-200/70 leading-snug">
                Mercedes Sprinter 314 · Écrans LED 3 faces (IP67) · 5 000–20 000 impressions/jour
                · Vidéo, image, flux HTML5 · Idéal zones haute densité
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Field label="Titre du brief">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5" placeholder="Ex. Campagne street food Paris 11e" />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={2000} rows={4}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Marque, message clé, ton, contraintes, audience cible…" />
          </Field>

          <Field label="Types de véhicules recherchés">
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((t) => {
                const blockedByBoxled = adFormat === "boxled" && BOXLED_INCOMPATIBLE.includes(t.v as VehicleKey);
                const isCamionLed = t.v === "camion_led";
                const isSelected = vehicleTypes.includes(t.v);
                return (
                  <button
                    type="button"
                    key={t.v}
                    disabled={blockedByBoxled}
                    title={blockedByBoxled ? "Incompatible avec le format Écran LED/Vidéo (BoxLED)" : t.tip}
                    onClick={() => toggleType(t.v)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      blockedByBoxled
                        ? "opacity-40 cursor-not-allowed bg-card border-border"
                        : isSelected && isCamionLed
                          ? "border-blue-500 font-semibold"
                          : isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : isCamionLed
                              ? "border-blue-500/50 hover:border-blue-500"
                              : "bg-card border-border hover:bg-secondary"
                    }`}
                    style={isCamionLed ? {
                      background: isSelected
                        ? "linear-gradient(135deg, #1a3a8f, #0f2060)"
                        : "linear-gradient(135deg, rgba(15,25,70,0.6), rgba(10,15,40,0.8))",
                      color: isSelected ? "#fff" : "rgba(120,170,255,0.9)",
                      boxShadow: isSelected ? "0 0 14px 2px rgba(40,100,255,0.25)" : undefined,
                    } : undefined}
                  >
                    {t.l}
                    {isCamionLed && !isSelected && (
                      <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                        style={{ background: "rgba(60,120,255,0.2)", color: "rgba(100,160,255,0.9)" }}>
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {adFormat === "boxled" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                ⚠️ Le format <strong>Écran LED/Vidéo (BoxLED)</strong> est réservé aux fourgons publicitaires numériques. Food truck, scooter, vélo cargo et triporteur sont incompatibles.
              </p>
            )}
          </Field>

          {vehicleTypes.includes("autre") && (
            <Field label="Précisez le véhicule « Autre » recherché *">
              <input
                type="text"
                maxLength={120}
                value={autreVehicleNote}
                onChange={(e) => setAutreVehicleNote(e.target.value)}
                placeholder="Ex. Rickshaw, bateau fluvial, camion brasserie…"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Cette précision aide les propriétaires à évaluer si leur véhicule correspond à votre besoin.</p>
            </Field>
          )}

          <Field label="Format publicitaire">
            <div className="flex flex-wrap gap-2">
              {AD_FORMATS.map((f) => {
                const incompatible = f.v === "boxled" && vehicleTypes.length > 0 && isFormatIncompatible(vehicleTypes, "boxled");
                return (
                  <button
                    type="button"
                    key={f.v}
                    disabled={incompatible}
                    title={incompatible ? "Incompatible avec le(s) véhicule(s) sélectionné(s) — BoxLED réservé aux fourgons publicitaires" : f.desc}
                    onClick={() => {
                      if (incompatible) return;
                      setAdFormat((cur) => cur === f.v ? null : f.v);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      incompatible
                        ? "opacity-40 cursor-not-allowed bg-card border-border line-through"
                        : adFormat === f.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-secondary"
                    }`}
                  >
                    {f.l}
                  </button>
                );
              })}
            </div>
            {isFormatIncompatible(vehicleTypes, "boxled") && vehicleTypes.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                ⚠️ <strong>Écran LED/Vidéo (BoxLED)</strong> non disponible : un ou plusieurs véhicules sélectionnés (food truck, scooter, vélo cargo, triporteur) n'existent pas en version BoxLED de série.
              </p>
            )}
          </Field>

          {/* Prévisualisation 3D — visible dès qu'un type de véhicule ET un format sont sélectionnés */}
          {vehicleTypes.length > 0 && adFormat && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Couleur de marque</label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-card"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{brandColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Visuel (logo ou vidéo)</label>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      if (file.type.startsWith("video/")) {
                        setScreenVideoUrl(url);
                        setLogoUrl(null);
                      } else {
                        setLogoUrl(url);
                        setScreenVideoUrl(null);
                      }
                    }}
                  />
                  {(logoUrl || screenVideoUrl) && (
                    <button
                      type="button"
                      onClick={() => { setLogoUrl(null); setScreenVideoUrl(null); }}
                      className="text-xs text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {vehicleTypes.includes("camion_led") && (
                <Suspense fallback={<div className="h-[520px] rounded-2xl bg-[#0c0d1a] animate-pulse flex items-center justify-center text-sm text-white/40">Chargement du camion LED 3D…</div>}>
                  <CamionLED3DPreview
                    screenVideoUrl={screenVideoUrl}
                    logoUrl={logoUrl}
                  />
                </Suspense>
              )}
              {!vehicleTypes.includes("camion_led") && (
              <Suspense fallback={<div className="h-64 rounded-2xl bg-secondary/40 animate-pulse flex items-center justify-center text-sm text-muted-foreground">Chargement du simulateur…</div>}>
                <VehicleMockup3D
                  vehicleTypes={vehicleTypes}
                  adFormat={adFormat}
                  brandColor={brandColor}
                  logoUrl={logoUrl}
                  screenVideoUrl={screenVideoUrl}
                />
              </Suspense>
              )}
              {vehicleTypes.every((t) => t === "autre") && (
                <p className="text-xs text-muted-foreground italic px-1">
                  ℹ️ Aperçu schématique sur un gabarit générique — la forme réelle dépend du véhicule « autre » proposé par le propriétaire. Vous verrez les vraies photos après mise en relation.
                </p>
              )}
            </div>
          )}

          <Field label="Zone de ciblage sur la carte (optionnel)">
            <ZonePolygonDraw
              searchQuery={zoneSearchQuery}
              onChange={(z) => {
                setZonePolygon(z);
                if (z?.detectedZones && z.detectedZones.length > 0) {
                  setZones(z.detectedZones.join("\n"));
                  // Don't update zoneSearchQuery — map-filled text mustn't re-trigger forward geocoding
                }
              }}
            />
          </Field>

          <Field label="Zones / quartiers cibles">
            <textarea
              value={zones}
              onChange={(e) => {
                setZones(e.target.value);
                setZoneSearchQuery(e.target.value); // only manual typing triggers geocoding
              }}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Tapez un quartier pour centrer la carte, ou dessinez sur la carte" />
            <p className="text-xs text-muted-foreground mt-1">Rempli automatiquement quand vous dessinez sur la carte — modifiable.</p>
            {zonePolygon && estimatedDays > 0 && (() => {
              const est = estimateZoneBudget(
                zonePolygon.areaKm2,
                estimatedDays,
                1,
                zonePolygon.coordinates as [number, number][],
              );
              return (
                <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                  <p className="font-medium">Budget estimé pour cette zone</p>
                  <p className="mt-1 text-muted-foreground">
                    {zonePolygon.areaKm2.toFixed(2)} km² × {estimatedDays} jour(s) ≈{" "}
                    <strong className="text-foreground">
                      {est.total.toLocaleString("fr-FR")} €
                    </strong>{" "}
                    ({est.perDay} €/jour · {est.ratePerKm2PerDay} €/km²/jour)
                  </p>
                  {est.denseMetro && (
                    <p className="mt-2 text-xs text-foreground">
                      🏙️ Zone dense détectée ({est.denseMetro}) : coefficient ×{est.multiplier} appliqué
                      pour forte visibilité.
                    </p>
                  )}
                </div>
              );
            })()}
          </Field>


          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de début">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
            <Field label="Date de fin">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget max (€, optionnel)">
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
            <Field label="Audience cible (optionnel)">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={200}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" placeholder="Ex. 25-40 ans urbains" />
            </Field>
          </div>

          <Field label="Visuels publicitaires (optionnel)">
            <input type="file" multiple accept="image/*,application/pdf,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full text-sm" />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} fichier(s) sélectionné(s)</p>}
          </Field>

          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">📜 Propriété intellectuelle :</strong> en soumettant un visuel publicitaire, vous garantissez en détenir tous les droits (créations, marques, droit à l'image, musiques) et vous engagez à respecter la législation française et européenne.
          </div>

          {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Publication…" : "Publier le brief"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
