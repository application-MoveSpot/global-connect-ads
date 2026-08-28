import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { captureError } from "@/lib/sentry";
import { LogoLink } from "@/components/app/LogoLink";
import { findForbiddenKeyword } from "@/lib/campaigns/forbidden-keywords";
import { ZoneSelector, polygonToEwkt, type ZonePolygon } from "@/components/advertiser/ZoneSelector";
import { estimateZoneBudget } from "@/lib/geo/zone-budget";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { AD_FORMATS, BOXLED_INCOMPATIBLE, CAMION_LED_SPEC, isFormatIncompatible, type AdFormat, type VehicleKey } from "@/components/advertiser/VehicleMockup3D";
import { RouteError } from "@/components/app/RouteError";
import { resizeImageFile } from "@/lib/images/resize";

const VehicleMockup3D = lazy(() =>
  import("@/components/advertiser/VehicleMockup3D").then((m) => ({ default: m.VehicleMockup3D }))
);

const CamionLEDMockupPreview = lazy(() =>
  import("@/components/advertiser/CamionLEDMockupPreview").then((m) => ({ default: m.CamionLEDMockupPreview }))
);

export const Route = createFileRoute("/annonceur/briefs/nouveau")({
  head: () => ({
    meta: [
      { title: "Nouveau brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewBriefPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
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
  const led3dRef = useRef<HTMLDivElement>(null);
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
        // Scroll vers la prévisualisation 3D dès qu'elle apparaît
        setTimeout(() => led3dRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
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

    // Upload creatives (resize images before upload, max 2000px for ad visuals)
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const resized = await resizeImageFile(f, 2000, 0.87);
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/briefs/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("campaign-creatives")
        .upload(path, resized, { upsert: false, contentType: resized.type });
      if (upErr) { captureError(upErr, "upload", { flow: "brief_creative", fileName: f.name }); setError(`Upload échoué : ${f.name}`); setLoading(false); return; }
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

    if (insErr) {
      // Nettoyer les fichiers déjà uploadés pour éviter les orphelins
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("campaign-creatives").remove(uploadedPaths);
      }
      setLoading(false);
      // Message clair à la place du message d'erreur brut de la base
      const isEnumError = insErr.message?.includes("invalid input value for enum") || insErr.message?.includes("vehicle_type");
      setError(
        isEnumError
          ? "Le type de véhicule sélectionné n'est pas encore disponible sur cette version. Veuillez réessayer dans quelques minutes ou contacter le support."
          : `Erreur lors de la création du brief : ${insErr.message}`
      );
      return;
    }
    setLoading(false);
    void track("brief_created", { brief_id: data!.id, vehicle_types: vehicleTypes, has_zone: !!zonePolygon });

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
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
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

        {/* ── Showcase Camion LED BoxLED — toujours visible ────────────────── */}
        <div className="mb-8 rounded-2xl border border-blue-500/30 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #080e28 0%, #050a1c 100%)" }}>
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Photo réelle */}
            <div className="sm:w-64 shrink-0 overflow-hidden" style={{ maxHeight: 200 }}>
              <img
                src="/camion-led.webp"
                alt="Camion Écran LED BoxLED"
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", display: "block", minHeight: 160 }}
              />
            </div>
            {/* Infos */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-white text-base">📺 Camion Écran LED BoxLED</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(37,99,235,0.3)", color: "rgba(147,197,253,0.95)", border: "1px solid rgba(59,130,246,0.3)" }}>
                    EXCLUSIF MOVESPOT
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: "rgba(147,197,253,0.75)", lineHeight: 1.6 }}>
                  Mercedes Sprinter 314 · 3 faces d'écran LED IP67 actives · 3 200 × 1 920 px ·
                  Diffusion vidéo MP4, image dynamique ou flux HTML5 · Visibilité jour &amp; nuit ·
                  Idéal zones haute densité &amp; événementiel
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["5 000–20 000 impressions/j", "150–800 €/sem.", "Centre-ville", "Événementiel", "Grands axes"].map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(30,58,138,0.35)", color: "rgba(147,197,253,0.8)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-[11px]" style={{ color: "rgba(100,150,255,0.55)" }}>
                ↓ Sélectionnez ce véhicule ci-dessous pour voir la prévisualisation 3D 360° en temps réel
              </div>
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
            {/* ── Camion LED BoxLED — carte hero ────────────────────────────── */}
            <button
              type="button"
              onClick={() => toggleType("camion_led")}
              className="w-full text-left rounded-2xl border-2 transition-all overflow-hidden mb-3 focus:outline-none"
              style={{
                borderColor: vehicleTypes.includes("camion_led") ? "#3b6eff" : "rgba(59,110,255,0.25)",
                background: vehicleTypes.includes("camion_led")
                  ? "linear-gradient(135deg, #0d1a4a 0%, #091030 100%)"
                  : "linear-gradient(135deg, rgba(8,12,30,0.9) 0%, rgba(5,8,20,0.95) 100%)",
                boxShadow: vehicleTypes.includes("camion_led")
                  ? "0 0 0 1px rgba(59,110,255,0.4), 0 4px 32px rgba(30,80,255,0.18)"
                  : "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-stretch gap-0">
                {/* Photo réelle du camion LED */}
                <div className="shrink-0 overflow-hidden" style={{ width: 180, minWidth: 180, background: "#000" }}>
                  <img
                    src="/camion-led.webp"
                    alt="Camion Écran LED BoxLED"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", display: "block", minHeight: 140 }}
                  />
                </div>

                {/* Infos */}
                <div className="flex-1 py-3.5 px-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">📺 Camion Écran LED BoxLED</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(59,110,255,0.25)", color: "rgba(130,180,255,0.95)", border: "1px solid rgba(59,110,255,0.3)" }}>
                        EXCLUSIF
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "rgba(130,170,255,0.7)" }}>
                      Fourgon publicitaire numérique — 3 faces d'écran LED actives
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        "3 faces actives",
                        "IP67 · Jour & nuit",
                        "3200 × 1920 px",
                        "Vidéo MP4 / Image",
                      ].map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(30,60,180,0.2)", color: "rgba(120,170,255,0.8)", border: "1px solid rgba(59,110,255,0.18)" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[10px]" style={{ color: "rgba(90,130,220,0.65)" }}>
                      150 – 800 € / semaine · 5 000 – 20 000 impressions
                    </span>
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                      style={vehicleTypes.includes("camion_led") ? {
                        background: "#3b6eff",
                        color: "#fff",
                        boxShadow: "0 0 10px rgba(59,110,255,0.5)",
                      } : {
                        background: "rgba(59,110,255,0.12)",
                        color: "rgba(120,170,255,0.8)",
                        border: "1px solid rgba(59,110,255,0.25)",
                      }}
                    >
                      {vehicleTypes.includes("camion_led") ? "✓ Sélectionné" : "Sélectionner"}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* ── Autres types de véhicules ────────────────────────────────── */}
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Autres véhicules
            </div>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.filter(t => t.v !== "camion_led").map((t) => {
                const blockedByBoxled = adFormat === "boxled" && BOXLED_INCOMPATIBLE.includes(t.v as VehicleKey);
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
                        : isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-secondary"
                    }`}
                  >
                    {t.l}
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

          {/* ── Prévisualisation 3D Camion LED — apparaît immédiatement après sélection ── */}
          {vehicleTypes.includes("camion_led") && (
            <div ref={led3dRef} className="space-y-3 scroll-mt-4">
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
              <Suspense fallback={<div className="h-[520px] rounded-2xl bg-[#0c0d1a] animate-pulse flex items-center justify-center text-sm text-white/40">Chargement du camion LED 3D…</div>}>
                <CamionLEDMockupPreview
                  screenVideoUrl={screenVideoUrl}
                  logoUrl={logoUrl}
                />
              </Suspense>
            </div>
          )}

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

          {/* Prévisualisation 3D — autres véhicules (hors camion_led géré plus haut) */}
          {vehicleTypes.length > 0 && adFormat && !vehicleTypes.includes("camion_led") && (
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
              <Suspense fallback={<div className="h-64 rounded-2xl bg-secondary/40 animate-pulse flex items-center justify-center text-sm text-muted-foreground">Chargement du simulateur…</div>}>
                <VehicleMockup3D
                  vehicleTypes={vehicleTypes}
                  adFormat={adFormat}
                  brandColor={brandColor}
                  logoUrl={logoUrl}
                  screenVideoUrl={screenVideoUrl}
                />
              </Suspense>
              {vehicleTypes.every((t) => t === "autre") && (
                <p className="text-xs text-muted-foreground italic px-1">
                  ℹ️ Aperçu schématique sur un gabarit générique — la forme réelle dépend du véhicule « autre » proposé par le propriétaire. Vous verrez les vraies photos après mise en relation.
                </p>
              )}
            </div>
          )}

          <Field label="Zone de ciblage sur la carte (optionnel)">
            <ZoneSelector
              searchQuery={zoneSearchQuery}
              vehicleTypes={vehicleTypes}
              onChange={(z) => {
                setZonePolygon(z);
                if (z?.detectedZones && z.detectedZones.length > 0) {
                  setZones(z.detectedZones.join("\n"));
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
