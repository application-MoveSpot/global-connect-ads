import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { captureError } from "@/lib/sentry";
import { LogoLink } from "@/components/app/LogoLink";
import { findForbiddenKeyword, findForbiddenMatch } from "@/lib/campaigns/forbidden-keywords";
import { ZoneSelector, polygonToEwkt, type ZonePolygon } from "@/components/advertiser/ZoneSelector";
import { estimateZoneBudget, MIN_EUR_PER_DAY } from "@/lib/geo/zone-budget";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { AD_FORMATS, BOXLED_INCOMPATIBLE, CAMION_LED_SPEC, isFormatIncompatible, type AdFormat, type VehicleKey } from "@/components/advertiser/ad-formats";
import { RouteError } from "@/components/app/RouteError";
import { resizeImageFile } from "@/lib/images/resize";
import { VehiclePhotoAdPreview } from "@/components/advertiser/VehiclePhotoAdPreview";


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

type EventTemplate = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  vehicleTypes: string[];
  adFormat: AdFormat;
  days: number;
  titleTpl: string;
  descTpl: string;
  audience: string;
};

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "mariage",
    icon: "💍",
    label: "Mariage",
    desc: "Annoncez votre grand jour dans votre ville",
    vehicleTypes: ["taxi", "voiture"],
    adFormat: "demi_covering",
    days: 7,
    titleTpl: "Mariage de [Prénom & Prénom] — [Ville]",
    descTpl: "Nous nous marions le [date] à [lieu] et souhaitons le faire savoir dans [ville] et ses alentours. Visuel sobre et élégant fourni.",
    audience: "Famille, amis, connaissances locales",
  },
  {
    id: "ouverture",
    icon: "🏪",
    label: "Ouverture de commerce",
    desc: "Boutique, restaurant, salon, studio…",
    vehicleTypes: ["van", "taxi"],
    adFormat: "demi_covering",
    days: 14,
    titleTpl: "Ouverture [Nom du commerce] — [Ville]",
    descTpl: "Ouverture prochaine de [nom du commerce] au [adresse]. Venez nous découvrir ! Promotion d'inauguration le [date].",
    audience: "Habitants du quartier, passants, clients locaux",
  },
  {
    id: "association",
    icon: "🤝",
    label: "Association / Bénévolat",
    desc: "Appel aux membres, collecte, événement",
    vehicleTypes: ["velo_cargo", "voiture"],
    adFormat: "stickers",
    days: 14,
    titleTpl: "Rejoignez [Nom de l'asso] — [Ville]",
    descTpl: "L'association [nom] recherche des bénévoles / organise [événement] le [date] à [lieu]. Toutes les informations sur [site / contact].",
    audience: "Habitants engagés, grand public local",
  },
  {
    id: "culturel",
    icon: "🎭",
    label: "Événement culturel",
    desc: "Concert, expo, spectacle, projection",
    vehicleTypes: ["van", "voiture"],
    adFormat: "demi_covering",
    days: 7,
    titleTpl: "[Nom de l'événement] — [Date] à [Ville]",
    descTpl: "[Description : type, artistes, programme]. Entrée [gratuite / prix]. Réservations sur [lien ou contact].",
    audience: "Grand public, amateurs de culture, 18-55 ans",
  },
  {
    id: "festival",
    icon: "🎪",
    label: "Festival / Marché",
    desc: "Marché artisanal, festival, fête locale",
    vehicleTypes: ["food_truck", "van"],
    adFormat: "covering_total",
    days: 3,
    titleTpl: "[Nom du festival / marché] — [Dates] à [Lieu]",
    descTpl: "[Nombre] exposants, animations, restauration sur place. Entrée [gratuite / prix]. [Dates et horaires].",
    audience: "Familles, habitants, touristes",
  },
  {
    id: "inauguration",
    icon: "🎗️",
    label: "Inauguration / Lancement",
    desc: "Nouveau local, produit, service, projet",
    vehicleTypes: ["voiture", "van"],
    adFormat: "demi_covering",
    days: 7,
    titleTpl: "Inauguration [Nom du projet] — [Ville]",
    descTpl: "[Description du projet ou service]. Cérémonie d'inauguration le [date] à [lieu]. Tout le monde est bienvenu !",
    audience: "Professionnels, grand public, curieux",
  },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function NewBriefPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<"event-type" | "form">("event-type");
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
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
  const [previewVehicleId, setPreviewVehicleId] = useState<string | null>(null);
  const [previewSearching, setPreviewSearching] = useState(false);
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("user_id, account_type")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) { navigate({ to: "/annonceur/inscription" }); return; }
      setUserId(sess.session.user.id);
      const type = (prof as { account_type?: string }).account_type ?? "business";
      setAccountType(type);
      if (type !== "individual") setWizardStep("form");
    })();
  }, [navigate]);

  // Auto-find a real approved vehicle matching selected types for live preview
  useEffect(() => {
    if (vehicleTypes.length === 0) {
      setPreviewVehicleId(null);
      return;
    }
    setPreviewSearching(true);
    supabase
      .from("vehicles")
      .select("id")
      .eq("status", "approved")
      .in("type", vehicleTypes as never)
      .not("photos", "is", null)
      .limit(1)
      .maybeSingle()
      .then(
        ({ data }) => { setPreviewVehicleId(data?.id ?? null); setPreviewSearching(false); },
        () => { setPreviewVehicleId(null); setPreviewSearching(false); },
      );
  }, [vehicleTypes]);

  const applyTemplate = (tpl: EventTemplate) => {
    setSelectedTemplate(tpl);
    setTitle(tpl.titleTpl);
    setDescription(tpl.descTpl);
    setVehicleTypes(tpl.vehicleTypes);
    setAdFormat(tpl.adFormat);
    setAudience(tpl.audience);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(isoDate(tomorrow));
    setEndDate(addDays(tomorrow, tpl.days - 1));
    setWizardStep("form");
  };

  const estimatedDays =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
      : 0;

  const toggleType = (v: string) => {
    setVehicleTypes((cur) => {
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (v === "camion_led" && !cur.includes("camion_led")) {
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
    navigate({ to: "/annonceur/briefs/confirmation/$briefId", params: { briefId: data!.id } });
  };

  if (wizardStep === "event-type" && accountType === "individual") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <LogoLink />
            <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Quel est votre projet ?</h1>
            <p className="text-sm text-muted-foreground">
              Choisissez un type d'événement — le formulaire sera pré-rempli pour vous.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {EVENT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all p-5 group"
              >
                <div className="text-3xl mb-3">{tpl.icon}</div>
                <p className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{tpl.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tpl.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.vehicleTypes.map((v) => (
                    <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {VEHICLE_TYPES.find((t) => t.v === v)?.l ?? v}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {tpl.days} jours
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-primary font-medium">
                  À partir de {MIN_EUR_PER_DAY * tpl.days} € pour 1 véhicule
                </p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setWizardStep("form")}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Remplir manuellement sans modèle →
            </button>
          </div>
        </main>
      </div>
    );
  }

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

        {accountType === "individual" && (
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => setWizardStep("event-type")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Changer de type d'événement
            </button>
            {selectedTemplate && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {selectedTemplate.icon} {selectedTemplate.label}
              </span>
            )}
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

          <ContentChecker text={`${title} ${description} ${audience}`} />

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

          {/* Aperçu automatique sur un véhicule réel disponible */}
          {vehicleTypes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">🎨 Aperçu sur véhicule réel</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Couleur de marque</label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-card"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Logo (optionnel)</label>
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
                    <button type="button" onClick={() => setLogoUrl(null)} className="text-xs text-destructive">✕</button>
                  )}
                </div>
              </div>
              {previewSearching ? (
                <div className="h-48 rounded-xl bg-secondary/40 flex items-center justify-center animate-pulse">
                  <span className="text-sm text-muted-foreground">Recherche d'un véhicule disponible…</span>
                </div>
              ) : previewVehicleId ? (
                <VehiclePhotoAdPreview
                  vehicleId={previewVehicleId}
                  brandColor={brandColor}
                  logoUrl={logoUrl}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-5 text-center text-sm text-muted-foreground">
                  <p>📷 Aucun véhicule de ce type n'a encore mis ses photos en ligne.</p>
                  <p className="text-xs mt-1 opacity-70">L'aperçu apparaîtra automatiquement dès qu'un propriétaire ajoutera ses photos.</p>
                </div>
              )}
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

          <LiveBudgetEstimator
            days={estimatedDays}
            vehicleCount={vehicleTypes.length}
            zonePolygon={zonePolygon}
          />

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

function ContentChecker({ text }: { text: string }) {
  const [match, setMatch] = useState<ReturnType<typeof findForbiddenMatch>>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(false);
    const id = setTimeout(() => {
      setMatch(findForbiddenMatch(text.trim()));
      setChecked(true);
    }, 400);
    return () => clearTimeout(id);
  }, [text]);

  if (!checked || text.trim().length < 5) return null;

  if (match) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 space-y-2">
        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
          ⛔ Contenu non conforme — {match.category}
        </p>
        <p className="text-xs text-destructive/80">
          Le terme <strong>« {match.keyword} »</strong> est interdit par la charte MoveSpot.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{match.advice}</p>
        <p className="text-xs font-medium text-destructive">
          Ce brief sera refusé automatiquement si vous le soumettez tel quel.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2">
      <span className="text-emerald-500 text-sm">✓</span>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Contenu conforme à la charte MoveSpot</p>
    </div>
  );
}

function LiveBudgetEstimator({
  days,
  vehicleCount,
  zonePolygon,
}: {
  days: number;
  vehicleCount: number;
  zonePolygon: ZonePolygon | null;
}) {
  if (days <= 0 && vehicleCount === 0) return null;

  const v = Math.max(1, vehicleCount);
  const d = Math.max(1, days);

  const rows = [1, 3, 5].map((n) => {
    let total: number;
    if (zonePolygon) {
      total = estimateZoneBudget(
        zonePolygon.areaKm2,
        d,
        n,
        zonePolygon.coordinates as [number, number][],
      ).total;
    } else {
      total = MIN_EUR_PER_DAY * d * n;
    }
    return { n, total };
  });

  const isDense = zonePolygon
    ? estimateZoneBudget(zonePolygon.areaKm2, d, 1, zonePolygon.coordinates as [number, number][]).denseMetro
    : null;

  const floorForV = MIN_EUR_PER_DAY * d * v;
  const approxForV = zonePolygon
    ? estimateZoneBudget(zonePolygon.areaKm2, d, v, zonePolygon.coordinates as [number, number][]).total
    : floorForV;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-semibold text-sm">Estimation de budget</p>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {zonePolygon ? "zone dessinée ✓" : "mise à jour en temps réel"}
        </span>
      </div>

      {days <= 0 ? (
        <p className="text-xs text-muted-foreground">Sélectionnez des dates pour affiner l'estimation.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 font-medium">Véhicules retenus</th>
                  <th className="text-right py-1.5 font-medium">Estimation totale</th>
                  <th className="text-right py-1.5 font-medium">Par jour</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ n, total }) => (
                  <tr key={n} className={`border-b border-border/40 ${n === v ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    <td className="py-2">
                      {n} véhicule{n > 1 ? "s" : ""}
                      {n === v && vehicleCount > 0 && (
                        <span className="ml-2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">sélectionné</span>
                      )}
                    </td>
                    <td className="text-right py-2">{total.toLocaleString("fr-FR")} €</td>
                    <td className="text-right py-2 text-xs">{Math.round(total / d)} €/j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isDense && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              🏙️ Zone dense ({isDense}) — coefficient ×1,5 inclus dans l'estimation.
            </p>
          )}

          <div className="rounded-lg bg-background/60 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p>• Estimation basée sur {zonePolygon ? `${zonePolygon.areaKm2.toFixed(1)} km² dessinés` : "le tarif plancher"} × {d} jour{d > 1 ? "s" : ""}.</p>
            <p>• Le montant final dépend des propositions des propriétaires — vous ne payez qu'à la validation.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/annonceur/portefeuille"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
            >
              💳 Préparer {approxForV.toLocaleString("fr-FR")} €
            </Link>
            <Link
              to="/annonceur/pack"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Ou acheter un pack →
            </Link>
          </div>
        </>
      )}
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
