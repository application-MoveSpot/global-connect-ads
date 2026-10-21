import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { track } from "@/lib/analytics/track";
import { firePixelEvent } from "@/lib/analytics/pixels";
import { captureError } from "@/lib/sentry";
import { LogoLink } from "@/components/app/LogoLink";
import { findForbiddenKeyword, findForbiddenMatch } from "@/lib/campaigns/forbidden-keywords";
import { detectContact } from "@/lib/moderation/contact-detection";
import { US_CITIES, findUsCity } from "@/lib/compliance/us-markets";
import { EU_CITIES, findEuCity, getEuCitiesByCountry } from "@/lib/compliance/eu-markets";
import { AF_CITIES, findAfCity, getAfCitiesByCountry } from "@/lib/compliance/africa-markets";
import { AS_CITIES, findAsCity, getAsCitiesByCountry } from "@/lib/compliance/asia-markets";
import {
  CONTENT_CATEGORIES,
  checkContentCompliance,
  checkFrContentCompliance,
  checkEuContentCompliance,
  checkAfContentCompliance,
  checkAsContentCompliance,
} from "@/lib/compliance/content-restrictions";
import {
  ZoneSelector,
  polygonToEwkt,
  type ZonePolygon,
} from "@/components/advertiser/ZoneSelector";
import { estimateZoneBudget, MIN_EUR_PER_DAY } from "@/lib/geo/zone-budget";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import {
  AD_FORMATS,
  BOXLED_INCOMPATIBLE,
  CAMION_LED_SPEC,
  isFormatIncompatible,
  type AdFormat,
  type VehicleKey,
} from "@/components/advertiser/ad-formats";
import { RouteError } from "@/components/app/RouteError";
import { resizeImageFile } from "@/lib/images/resize";
import { VehiclePhotoAdPreview } from "@/components/advertiser/VehiclePhotoAdPreview";
import { generateBriefSuggestion } from "@/lib/ai/brief-assistant.functions";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { scoreBriefQuality, type BriefQualityResult } from "@/lib/ai/brief-quality.functions";
import { validateBriefCreative } from "@/lib/ai/visual-validation.functions";
import { notifyBriefCreated } from "@/lib/campaigns/campaign-notifications.server";
import { AdvertiserBudgetEstimate } from "@/components/advertiser/AdvertiserBudgetEstimate";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/advertiser/briefs/nouveau")({
  head: () => ({
    meta: [{ title: "Nouveau brief — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: NewBriefPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const VEHICLE_TYPES: { v: string; l: string; tip?: string }[] = [
  {
    v: "camion_led",
    l: "📺 Camion LED",
    tip:
      `${CAMION_LED_SPEC.name} — ${CAMION_LED_SPEC.vehicleClass}\n` +
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
    id: "association",
    icon: "🤝",
    label: "Association & événement local",
    desc: "Club sportif, comité des fêtes, association culturelle…",
    vehicleTypes: ["taxi", "voiture", "van"],
    adFormat: "demi_covering",
    days: 7,
    titleTpl: "[Nom de l'association] — [Événement] à [Ville]",
    descTpl:
      "Nous organisons [événement] le [date] à [lieu]. Venez nombreux ! Informations et inscriptions sur [contact/site].",
    audience: "Habitants du quartier, familles, sympathisants",
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
    descTpl:
      "Ouverture prochaine de [nom du commerce] au [adresse]. Venez nous découvrir ! Promotion d'inauguration le [date].",
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
    descTpl:
      "L'association [nom] recherche des bénévoles / organise [événement] le [date] à [lieu]. Toutes les informations sur [site / contact].",
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
    descTpl:
      "[Description : type, artistes, programme]. Entrée [gratuite / prix]. Réservations sur [lien ou contact].",
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
    descTpl:
      "[Nombre] exposants, animations, restauration sur place. Entrée [gratuite / prix]. [Dates et horaires].",
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
    descTpl:
      "[Description du projet ou service]. Cérémonie d'inauguration le [date] à [lieu]. Tout le monde est bienvenu !",
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
  const { t, i18n } = useTranslation();
  const vtLabel = (v: string) =>
    t(`briefs.vehicle.${v}`, { defaultValue: VEHICLE_TYPES.find((vt) => vt.v === v)?.l ?? v });
  const fmtLabel = (v: string, fallback: string) =>
    t(`briefs.ad_format.${v}`, { defaultValue: fallback });
  const fmtDesc = (v: string, fallback: string) =>
    t(`briefs.ad_format_desc.${v}`, { defaultValue: fallback });
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<"event-type" | "form">("form");
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
  const [market, setMarket] = useState<"EU" | "US" | "AF" | "AS">("EU");
  const [euCity, setEuCity] = useState("");
  const [afCity, setAfCity] = useState("");
  const [asCity, setAsCity] = useState("");
  const [usCity, setUsCity] = useState("");
  const [contentCategory, setContentCategory] = useState("");
  const [previewVehicleId, setPreviewVehicleId] = useState<string | null>(null);
  const [previewSearching, setPreviewSearching] = useState(false);
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; amount: number } | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const [userAiKey, setUserAiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("movespot_user_ai_key_v1") ?? "";
    } catch {
      return "";
    }
  });
  const [qualityScore, setQualityScore] = useState<BriefQualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [creativeValidation, setCreativeValidation] = useState<
    Array<{ name: string; ok: boolean; score: number; issues: string[] }>
  >([]);
  const [creativeValidating, setCreativeValidating] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const DRAFT_KEY = "movespot_brief_draft_v1";

  // Restore draft on mount — only when the draft has meaningful content
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      const hasMeaningfulContent = Boolean(d.title || d.description || d.budget || d.audience);
      if (!hasMeaningfulContent) return;
      if (d.title) setTitle(d.title as string);
      if (d.description) setDescription(d.description as string);
      if (d.vehicleTypes) setVehicleTypes(d.vehicleTypes as string[]);
      if (d.zones) setZones(d.zones as string);
      if (d.startDate) setStartDate(d.startDate as string);
      if (d.endDate) setEndDate(d.endDate as string);
      if (d.budget) setBudget(d.budget as string);
      if (d.audience) setAudience(d.audience as string);
      if (d.autreVehicleNote) setAutreVehicleNote(d.autreVehicleNote as string);
      if (d.adFormat) setAdFormat(d.adFormat as typeof adFormat);
      if (d.brandColor) setBrandColor(d.brandColor as string);
      const savedMarket = d.market === "FR" ? "EU" : d.market;
      if (savedMarket) setMarket(savedMarket as "EU" | "US" | "AF" | "AS");
      if (d.usCity) setUsCity(d.usCity as string);
      if (d.frCity) setEuCity(d.frCity as string);
      else if (d.euCity) setEuCity(d.euCity as string);
      if (d.afCity) setAfCity(d.afCity as string);
      if (d.asCity) setAsCity(d.asCity as string);
      if (d.contentCategory) setContentCategory(d.contentCategory as string);
      setDraftRestored(true);
    } catch {
      /* localStorage inaccessible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft only after the user has started filling in the form
  useEffect(() => {
    if (created) return;
    const isDirty = Boolean(
      title ||
      description ||
      budget ||
      audience ||
      vehicleTypes.length > 0 ||
      zones ||
      startDate ||
      endDate,
    );
    if (!isDirty) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          title,
          description,
          vehicleTypes,
          zones,
          startDate,
          endDate,
          budget,
          audience,
          autreVehicleNote,
          adFormat,
          brandColor,
          market,
          usCity,
          euCity,
          afCity,
          asCity,
          contentCategory,
        }),
      );
    } catch {
      /* quota exceeded or private mode */
    }
  }, [
    title,
    description,
    vehicleTypes,
    zones,
    startDate,
    endDate,
    budget,
    audience,
    autreVehicleNote,
    adFormat,
    brandColor,
    created,
  ]);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        return;
      }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("user_id, account_type")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!prof) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      setUserId(session.user.id);
      const type = (prof as { account_type?: string }).account_type ?? "business";
      setAccountType(type);
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
        ({ data }) => {
          setPreviewVehicleId(data?.id ?? null);
          setPreviewSearching(false);
        },
        () => {
          setPreviewVehicleId(null);
          setPreviewSearching(false);
        },
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

  const handleAiGenerate = async () => {
    if (!aiContext.trim() || aiContext.trim().length < 10) {
      setAiError("Décrivez votre activité en au moins 10 caractères.");
      return;
    }
    setAiError("");
    setAiSessionExpired(false);
    setAiLoading(true);
    try {
      // Ensure we have a valid session before hitting the server function.
      // getOrRefreshSession() refreshes the access token if it is absent or
      // expires within 30 s, covering mobile tabs that were suspended.
      let session = await getOrRefreshSession();
      if (!session) {
        setAiSessionExpired(true);
        return;
      }
      let result = await generateBriefSuggestion({
        data: {
          businessContext: aiContext.trim(),
          vehicleTypes: vehicleTypes.length ? vehicleTypes : undefined,
          zone: zones.trim() || undefined,
          // Pass the token explicitly so the server can validate it even
          // when the Authorization header middleware doesn't fire.
          _auth: session.access_token,
          userApiKey: userAiKey || undefined,
        },
      });
      // Token may be stale — force-refresh and retry once before showing session error
      if (!result.ok && result.code === "UNAUTHORIZED") {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) {
          session = refreshed.session;
          result = await generateBriefSuggestion({
            data: {
              businessContext: aiContext.trim(),
              vehicleTypes: vehicleTypes.length ? vehicleTypes : undefined,
              zone: zones.trim() || undefined,
              _auth: session.access_token,
              userApiKey: userAiKey || undefined,
            },
          });
        }
      }
      if (!result.ok) {
        if (result.code === "UNAUTHORIZED") setAiSessionExpired(true);
        else setAiError(result.message);
        return;
      }
      const { suggestion } = result;
      const filled: string[] = [];
      setTitle(suggestion.title);
      filled.push("titre");
      setDescription(suggestion.description);
      filled.push("description");
      setAudience(suggestion.audience);
      filled.push("audience");
      if (suggestion.vehicleTypes?.length) {
        setVehicleTypes(suggestion.vehicleTypes);
        const hasLed = suggestion.vehicleTypes.includes("camion_led");
        if (hasLed) {
          setAdFormat("boxled");
        }
        filled.push("véhicules");
      }
      if (suggestion.zones) {
        setZones(suggestion.zones);
        setZoneSearchQuery(suggestion.zones);
        filled.push("zones");
      }
      if (suggestion.budget) {
        setBudget(String(suggestion.budget));
        filled.push("budget");
      }
      if (suggestion.durationDays) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(isoDate(tomorrow));
        setEndDate(addDays(tomorrow, suggestion.durationDays - 1));
        filled.push("durée");
      }
      setAiFilled(filled);
      setAiPanelOpen(false);
      setAiContext("");
    } catch (err) {
      if (err instanceof Response && err.status === 401) {
        setAiSessionExpired(true);
      } else {
        setAiError(err instanceof Error ? err.message : "Erreur de génération.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Score qualité brief — déclenché 2s après la dernière frappe sur titre+description
  useEffect(() => {
    const safeTitle = String(title ?? "");
    const safeDescription = String(description ?? "");
    const safeAudience = String(audience ?? "");
    const safeZones = String(zones ?? "");
    if (safeTitle.trim().length < 10 || safeDescription.trim().length < 30) {
      setQualityScore(null);
      return;
    }
    setQualityLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await scoreBriefQuality({
          data: {
            title: safeTitle.trim(),
            description: safeDescription.trim(),
            audience: safeAudience.trim() || undefined,
            vehicleTypes: vehicleTypes.length ? vehicleTypes : undefined,
            zone: safeZones.trim() || undefined,
          },
        });
        setQualityScore(result);
      } catch {
        // silencieux — timeout ou erreur AI ne bloque pas l'utilisateur
        setQualityScore(null);
      } finally {
        setQualityLoading(false);
      }
    }, 3000);
    return () => {
      clearTimeout(timer);
      setQualityLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, audience]);

  // Validation IA des visuels publicitaires — traitement en parallèle
  const handleCreativeValidation = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) {
      setCreativeValidation([]);
      return;
    }
    setCreativeValidating(true);
    setCreativeValidation([]);
    const results = await Promise.all(
      selectedFiles.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          return { name: file.name, ok: true, score: 100, issues: [] };
        }
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(",")[1] ?? "");
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const res = await validateBriefCreative({ data: { base64, mimeType: file.type } });
          return {
            name: file.name,
            ok: res.ok,
            score: res.score,
            issues: [...res.issues, ...res.tips.map((t: string) => `💡 ${t}`)],
          };
        } catch {
          return {
            name: file.name,
            ok: false,
            score: 0,
            issues: [
              "⚠️ Validation IA indisponible — ce visuel sera examiné manuellement par notre équipe.",
            ],
          };
        }
      }),
    );
    setCreativeValidation(results);
    setCreativeValidating(false);
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

  const createBriefForUser = async (uid: string) => {
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const resized = await resizeImageFile(f, 2000, 0.87);
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${uid}/briefs/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("campaign-creatives")
        .upload(path, resized, { upsert: false, contentType: resized.type });
      if (upErr) {
        captureError(upErr, "upload", { flow: "brief_creative", fileName: f.name });
        setError(`Upload échoué : ${f.name}`);
        setLoading(false);
        return;
      }
      uploadedPaths.push(path);
    }

    const zoneList = zones
      .split(/\r?\n|,/)
      .map((z) => z.trim())
      .filter(Boolean)
      .slice(0, 30);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const finalDescription =
      vehicleTypes.includes("autre") && autreVehicleNote.trim()
        ? `${description}\n\n[Véhicule autre recherché : ${autreVehicleNote.trim()}]`
        : description;

    const { data, error: insErr } = await supabase
      .from("advertiser_briefs")
      .insert([
        {
          advertiser_id: uid,
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
        },
      ])
      .select("id")
      .single();

    if (insErr) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("campaign-creatives").remove(uploadedPaths);
      }
      setLoading(false);
      const isEnumError =
        insErr.message?.includes("invalid input value for enum") ||
        insErr.message?.includes("vehicle_type");
      setError(
        isEnumError
          ? "Le type de véhicule sélectionné n'est pas encore disponible sur cette version. Veuillez réessayer dans quelques minutes ou contacter le support."
          : `Erreur lors de la création du brief : ${insErr.message}`,
      );
      return;
    }
    setLoading(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    void track("brief_created", {
      brief_id: data!.id,
      vehicle_types: vehicleTypes,
      has_zone: !!zonePolygon,
    });
    firePixelEvent("Lead", { content_name: "brief_created" });
    void notifyBriefCreated({ data: { briefId: data!.id } });

    const computed = zonePolygon
      ? estimateZoneBudget(
          zonePolygon.areaKm2,
          days,
          1,
          zonePolygon.coordinates as [number, number][],
        ).total
      : 0;
    if (computed > 0) {
      setCreated({ id: data!.id, amount: Math.max(10, Math.round(computed)) });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate({ to: "/advertiser/briefs/confirmation/$briefId", params: { briefId: data!.id } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (vehicleTypes.length === 0) {
      setError("Sélectionnez au moins un type de véhicule.");
      return;
    }
    if (vehicleTypes.includes("autre") && !autreVehicleNote.trim()) {
      setError(
        "Vous avez sélectionné « Autre » : veuillez préciser le type de véhicule recherché.",
      );
      return;
    }
    if (!startDate || !endDate) {
      setError("Dates obligatoires.");
      return;
    }
    if (endDate < startDate) {
      setError("La date de fin doit être après la date de début.");
      return;
    }
    const forbidden = findForbiddenKeyword(`${title} ${description} ${audience}`);
    if (forbidden) {
      setError(
        `Contenu interdit détecté : « ${forbidden} ». Charte MoveSpot : pas de campagne religieuse, politique/électorale, sexiste, pornographique, violente, ni d'anniversaire personnel.`,
      );
      return;
    }

    const allFreeText = [title, description, audience, autreVehicleNote].filter(Boolean).join(" ");
    const contactHit = detectContact(allFreeText);
    if (contactHit) {
      setError(
        `Coordonnées personnelles détectées (${contactHit.label}). Retirez-les du brief — MoveSpot sécurise toutes les mises en relation via la plateforme.`,
      );
      return;
    }

    if (market === "US") {
      if (!usCity) {
        setError("Sélectionnez une ville pour le marché Amériques.");
        return;
      }
      if (!contentCategory) {
        setError("La catégorie de contenu est obligatoire pour le marché Amériques.");
        return;
      }
      const compliance = checkContentCompliance(contentCategory, usCity);
      if (compliance.status === "blocked") {
        setError(compliance.reason);
        return;
      }
      const cityInfo = findUsCity(usCity);
      if (cityInfo?.status === "restricted") {
        setError(
          `La ville sélectionnée (${cityInfo.name}) est classée « accès restreint » pour la publicité mobile. ` +
            `Contactez MoveSpot avant de soumettre ce brief : une vérification juridique est requise.`,
        );
        return;
      }
    }

    if (market === "EU") {
      if (!euCity) {
        setError("Sélectionnez une ville européenne pour ce brief.");
        return;
      }
      if (!contentCategory) {
        setError("La catégorie de contenu est obligatoire.");
        return;
      }
      const euCityData = findEuCity(euCity);
      const euCompliance = euCityData?.isFrance
        ? checkFrContentCompliance(contentCategory)
        : checkEuContentCompliance(contentCategory);
      if (euCompliance.status === "blocked") {
        setError(euCompliance.reason);
        return;
      }
    }

    if (market === "AF") {
      if (!afCity) {
        setError("Sélectionnez une ville africaine pour ce brief.");
        return;
      }
      if (!contentCategory) {
        setError("La catégorie de contenu est obligatoire.");
        return;
      }
      const afCityData = AF_CITIES.find((c) => c.id === afCity);
      const afCompliance = checkAfContentCompliance(contentCategory, {
        blocked: afCityData?.alcoholBlocked,
        restricted: afCityData?.alcoholRestricted,
      });
      if (afCompliance.status === "blocked") {
        setError(afCompliance.reason);
        return;
      }
    }

    if (market === "AS") {
      if (!asCity) {
        setError("Sélectionnez une ville asiatique pour ce brief.");
        return;
      }
      if (!contentCategory) {
        setError("La catégorie de contenu est obligatoire.");
        return;
      }
      const asCityData = AS_CITIES.find((c) => c.id === asCity);
      const asCompliance = checkAsContentCompliance(contentCategory, {
        blocked: asCityData?.alcoholBlocked,
        restricted: asCityData?.alcoholRestricted,
      });
      if (asCompliance.status === "blocked") {
        setError(asCompliance.reason);
        return;
      }
    }

    if (!userId) {
      if (!showGuestSignup) {
        setShowGuestSignup(true);
        setTimeout(
          () =>
            document.getElementById("guest-signup-section")?.scrollIntoView({ behavior: "smooth" }),
          80,
        );
        return;
      }
      // Guest form is visible — validate and create account
      if (!guestEmail.trim()) {
        setError("Adresse email requise.");
        return;
      }
      if (guestPassword.length < 8) {
        setError("Mot de passe trop court (8 caractères minimum).");
        return;
      }
      setLoading(true);
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: guestEmail.trim().toLowerCase(),
        password: guestPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/advertiser/briefs/nouveau`,
          data: { role: "advertiser" },
        },
      });
      if (authErr) {
        const alreadyExists =
          authErr.message.includes("already registered") ||
          authErr.message.includes("already been registered") ||
          authErr.message.includes("User already registered");
        setError(
          alreadyExists
            ? "Cet email est déjà utilisé. Connectez-vous depuis l'espace advertiser."
            : `Erreur lors de la création du compte : ${authErr.message}`,
        );
        setLoading(false);
        return;
      }
      const newUserId = authData.user?.id;
      if (!newUserId) {
        setError("Erreur inattendue lors de la création du compte. Réessayez.");
        setLoading(false);
        return;
      }
      await supabase.from("advertiser_profiles").insert([
        {
          user_id: newUserId,
          account_type: "business",
          full_name: guestEmail.trim().toLowerCase(),
        },
      ] as never);
      setUserId(newUserId);
      await createBriefForUser(newUserId);
      return;
    }

    setLoading(true);
    await createBriefForUser(userId);
  };

  if (wizardStep === "event-type" && accountType === "individual") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <LogoLink />
            <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">
              {t("advertiser.briefs.nouveau.back")}
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              {t("advertiser.briefs.nouveau.event_type_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("advertiser.briefs.nouveau.event_type_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {EVENT_TEMPLATES.map((tpl, idx) => (
              <button
                key={`${tpl.id}-${idx}`}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all p-5 group"
              >
                <div className="text-3xl mb-3">{tpl.icon}</div>
                <p className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {t(`briefs.template.t${idx}.label`, { defaultValue: tpl.label })}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`briefs.template.t${idx}.desc`, { defaultValue: tpl.desc })}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.vehicleTypes.map((v) => (
                    <span
                      key={v}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                    >
                      {vtLabel(v)}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {t("advertiser.briefs.nouveau.event_type_days", { count: tpl.days })}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-primary font-medium">
                  {t("advertiser.briefs.nouveau.event_type_starting_at", {
                    amount: MIN_EUR_PER_DAY * tpl.days,
                  })}
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
              {t("advertiser.briefs.nouveau.event_type_manual")}
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
          <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">
            {t("advertiser.briefs.nouveau.back")}
          </Link>
        </div>
      </header>
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {created && (
          <div className="mb-8 rounded-2xl border border-primary/40 bg-primary/5 p-6">
            <h2 className="font-display text-2xl font-bold">
              {t("advertiser.briefs.nouveau.recap_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("advertiser.briefs.nouveau.recap_desc")}{" "}
              <strong className="text-foreground">
                {created.amount.toLocaleString(i18n.language)} €
              </strong>{" "}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WalletTopupCheckout
                amountEuros={created.amount}
                campaignBriefId={created.id}
                buttonLabel={t("advertiser.briefs.nouveau.recap_pay_btn")}
              />
              <Link
                to="/advertiser/briefs/$briefId"
                params={{ briefId: created.id }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("advertiser.briefs.nouveau.recap_pay_later")}
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
              {t("advertiser.briefs.nouveau.change_event_type")}
            </button>
            {selectedTemplate && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {selectedTemplate.icon} {selectedTemplate.label}
              </span>
            )}
          </div>
        )}

        <h1 className="font-display text-3xl font-bold mb-2">
          {t("advertiser.briefs.nouveau.form_title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("advertiser.briefs.nouveau.form_subtitle")}
        </p>

        {draftRestored && !created && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            <span>{t("advertiser.briefs.nouveau.draft_restored")}</span>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(DRAFT_KEY);
                } catch {
                  /* ignore */
                }
                setTitle("");
                setDescription("");
                setVehicleTypes([]);
                setZones("");
                setStartDate("");
                setEndDate("");
                setBudget("");
                setAudience("");
                setAutreVehicleNote("");
                setAdFormat(null);
                setBrandColor("#3B82F6");
                setDraftRestored(false);
              }}
              className="ml-4 underline hover:no-underline shrink-0"
            >
              {t("advertiser.briefs.nouveau.draft_clear")}
            </button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* ── Assistant IA ─────────────────────────────────────────────── */}
          <AiAssistantPanel
            variant="card"
            open={aiPanelOpen}
            onOpenChange={(v) => {
              setAiPanelOpen(v);
              setAiError("");
              setAiSessionExpired(false);
            }}
            context={aiContext}
            onContextChange={setAiContext}
            onGenerate={handleAiGenerate}
            loading={aiLoading}
            error={aiError}
            sessionExpired={aiSessionExpired}
            sessionExpiredHref="/advertiser/inscription?mode=signin"
            onReconnectClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch {
                /* ignore */
              }
              try {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("sb-"))
                  .forEach((k) => localStorage.removeItem(k));
              } catch {
                /* ignore */
              }
              window.location.href = "/advertiser/inscription?mode=signin";
            }}
            title={t("advertiser.briefs.nouveau.ai_panel_title")}
            description={t("advertiser.briefs.nouveau.ai_panel_desc")}
            inputLabel={t("advertiser.briefs.nouveau.ai_label")}
            generateLabel={t("advertiser.briefs.nouveau.ai_btn")}
            generateLoadingLabel={t("advertiser.briefs.nouveau.ai_btn_loading")}
            disclaimer={t("advertiser.briefs.nouveau.ai_disclaimer")}
            placeholder="Ex. Je suis une boulangerie artisanale à Lyon qui ouvre un 2e magasin. Je veux toucher les habitants du 6e arrondissement et les travailleurs du quartier Part-Dieu. Mon point fort : les viennoiseries au levain naturel."
            filledMessage={
              aiFilled.length > 0
                ? `✨ L'IA a rempli : ${aiFilled.join(", ")} — vérifiez et ajustez si besoin.`
                : undefined
            }
            onDismissFilled={() => setAiFilled([])}
            userApiKey={userAiKey}
            onUserApiKeyChange={(k) => {
              setUserAiKey(k);
              try {
                if (k) localStorage.setItem("movespot_user_ai_key_v1", k);
                else localStorage.removeItem("movespot_user_ai_key_v1");
              } catch {
                /* ignore */
              }
            }}
          />

          {/* ── Marché cible ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">{t("compliance.market_label")}</p>
              <div className="flex gap-2">
                {(["EU", "AF", "AS", "US"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMarket(m);
                      setUsCity("");
                      setEuCity("");
                      setAfCity("");
                      setAsCity("");
                      setContentCategory("");
                    }}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      market === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    {m === "EU"
                      ? "Europe"
                      : m === "AF"
                        ? "Afrique"
                        : m === "AS"
                          ? "Asie"
                          : "Amérique"}
                  </button>
                ))}
              </div>
            </div>

            {market === "US" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.us_city_label")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={usCity}
                    onChange={(e) => setUsCity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.us_city_placeholder")}</option>
                    {(["US", "CA", "MX"] as const).map((ctry) => {
                      const label =
                        ctry === "US"
                          ? "🇺🇸 États-Unis"
                          : ctry === "CA"
                            ? "🇨🇦 Canada"
                            : "🇲🇽 Mexique";
                      const open = US_CITIES.filter(
                        (c) => c.country === ctry && c.status !== "restricted",
                      );
                      const restricted = US_CITIES.filter(
                        (c) => c.country === ctry && c.status === "restricted",
                      );
                      return (
                        <optgroup key={ctry} label={label}>
                          {open.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}, {c.state}
                              {c.status === "license_required" ? " — Licence requise" : ""}
                            </option>
                          ))}
                          {restricted.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}, {c.state} — Restreint
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {usCity &&
                    (() => {
                      const city = findUsCity(usCity);
                      if (!city) return null;
                      return (
                        <div
                          className={`mt-2 text-xs px-3 py-2 rounded-lg leading-relaxed ${
                            city.status === "open"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : city.status === "license_required"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-red-500/10 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {city.status === "open" &&
                            "✓ Marché ouvert — publicité mobile sur flotte autorisée."}
                          {city.status === "license_required" &&
                            `⚠ Licence municipale requise. ${city.notes ?? ""}`}
                          {city.status === "restricted" &&
                            `⛔ Marché restreint. ${city.notes ?? ""}`}
                        </div>
                      );
                    })()}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.content_category_label")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={contentCategory}
                    onChange={(e) => setContentCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.content_category_placeholder")}</option>
                    {CONTENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {i18n.language === "en" ? cat.labelEn : cat.labelFr}
                      </option>
                    ))}
                  </select>
                  {contentCategory &&
                    usCity &&
                    (() => {
                      const result = checkContentCompliance(contentCategory, usCity);
                      if (result.status === "restricted") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 leading-relaxed">
                            ⚠ {result.disclaimer}
                          </div>
                        );
                      }
                      if (result.status === "blocked") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 leading-relaxed">
                            ⛔ {result.reason}
                          </div>
                        );
                      }
                      return (
                        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ {t("compliance.content_ok")}
                        </p>
                      );
                    })()}
                </div>

                <p className="text-xs text-muted-foreground">{t("compliance.us_legal_note")}</p>
              </>
            )}

            {market === "EU" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.eu_city_label")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={euCity}
                    onChange={(e) => setEuCity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.eu_city_placeholder")}</option>
                    {Array.from(getEuCitiesByCountry().entries()).map(([countryLabel, cities]) => (
                      <optgroup key={countryLabel} label={countryLabel}>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.status === "restreint" ? " — Réglementé" : ""}
                            {c.status === "zone_protegee" ? " — Zone protégée" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {euCity &&
                    (() => {
                      const city = findEuCity(euCity);
                      if (!city) return null;
                      return (
                        <div
                          className={`mt-2 text-xs px-3 py-2 rounded-lg leading-relaxed ${
                            city.status === "open"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : city.status === "restreint"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-red-500/10 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {city.isFrance &&
                            city.status === "open" &&
                            !city.isOutreMer &&
                            "✓ Marché ouvert — publicité mobile sur flotte autorisée."}
                          {city.isFrance &&
                            city.status === "open" &&
                            city.isOutreMer &&
                            `✓ DROM — droit national français applicable. ${city.notes ?? ""}`}
                          {city.isFrance &&
                            city.status === "restreint" &&
                            !city.isOutreMer &&
                            `⚠ RLP renforcé. ${city.notes ?? ""}`}
                          {city.isFrance &&
                            city.status === "restreint" &&
                            city.isOutreMer &&
                            `⚠ COM — règles locales partiellement autonomes. ${city.notes ?? ""}`}
                          {city.isFrance &&
                            city.status === "zone_protegee" &&
                            `⛔ Zone protégée. ${city.notes ?? ""}`}
                          {!city.isFrance &&
                            city.status === "open" &&
                            `✓ Marché ouvert. ${city.notes ?? "Publicité mobile sur flotte autorisée."}`}
                          {!city.isFrance &&
                            city.status === "restreint" &&
                            `⚠ Réglementé. ${city.notes ?? ""}`}
                          {!city.isFrance &&
                            city.status === "zone_protegee" &&
                            `⛔ Zone protégée. ${city.notes ?? ""}`}
                        </div>
                      );
                    })()}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.content_category_label")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={contentCategory}
                    onChange={(e) => setContentCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.content_category_placeholder")}</option>
                    {CONTENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.labelFr}
                      </option>
                    ))}
                  </select>
                  {contentCategory &&
                    (() => {
                      const selectedEuCity = findEuCity(euCity);
                      const result = selectedEuCity?.isFrance
                        ? checkFrContentCompliance(contentCategory)
                        : checkEuContentCompliance(contentCategory);
                      if (result.status === "restricted") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 leading-relaxed">
                            ⚠ {result.disclaimer}
                          </div>
                        );
                      }
                      if (result.status === "blocked") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 leading-relaxed">
                            ⛔ {result.reason}
                          </div>
                        );
                      }
                      return (
                        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          ✓{" "}
                          {selectedEuCity?.isFrance
                            ? t("compliance.fr_content_ok")
                            : t("compliance.eu_content_ok")}
                        </p>
                      );
                    })()}
                </div>

                <p className="text-xs text-muted-foreground">
                  {findEuCity(euCity)?.isFrance
                    ? t("compliance.fr_legal_note")
                    : t("compliance.eu_legal_note")}
                </p>
              </>
            )}

            {market === "AF" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.af_city_label")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={afCity}
                    onChange={(e) => setAfCity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.af_city_placeholder")}</option>
                    {Array.from(getAfCitiesByCountry().entries()).map(([countryLabel, cities]) => (
                      <optgroup key={countryLabel} label={countryLabel}>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.status === "restreint" ? " — Réglementé" : ""}
                            {c.status === "zone_protegee" ? " — Zone protégée" : ""}
                            {c.alcoholBlocked
                              ? " ⛔ alcool interdit"
                              : c.alcoholRestricted
                                ? " ⚠ alcool restreint"
                                : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {afCity &&
                    (() => {
                      const city = findAfCity(afCity);
                      if (!city) return null;
                      return (
                        <div
                          className={`mt-2 text-xs px-3 py-2 rounded-lg leading-relaxed ${
                            city.status === "zone_protegee"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : city.status === "restreint"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {city.status === "open" &&
                            `✓ Marché ouvert. ${city.notes ?? "Publicité mobile sur flotte autorisée."}`}
                          {city.status === "restreint" && `⚠ Réglementé. ${city.notes ?? ""}`}
                          {city.status === "zone_protegee" &&
                            `⛔ Zone protégée. ${city.notes ?? ""}`}
                        </div>
                      );
                    })()}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.content_category_label")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={contentCategory}
                    onChange={(e) => setContentCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.content_category_placeholder")}</option>
                    {CONTENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.labelFr}
                      </option>
                    ))}
                  </select>
                  {contentCategory &&
                    (() => {
                      const city = findAfCity(afCity);
                      const result = checkAfContentCompliance(contentCategory, {
                        blocked: city?.alcoholBlocked,
                        restricted: city?.alcoholRestricted,
                      });
                      if (result.status === "restricted") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 leading-relaxed">
                            ⚠ {result.disclaimer}
                          </div>
                        );
                      }
                      if (result.status === "blocked") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 leading-relaxed">
                            ⛔ {result.reason}
                          </div>
                        );
                      }
                      return (
                        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ {t("compliance.af_content_ok")}
                        </p>
                      );
                    })()}
                </div>

                <p className="text-xs text-muted-foreground">{t("compliance.af_legal_note")}</p>
              </>
            )}

            {market === "AS" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.as_city_label")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={asCity}
                    onChange={(e) => setAsCity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.as_city_placeholder")}</option>
                    {Array.from(getAsCitiesByCountry().entries()).map(([countryLabel, cities]) => (
                      <optgroup key={countryLabel} label={countryLabel}>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.status === "restreint" ? " — Réglementé" : ""}
                            {c.status === "zone_protegee" ? " — Zone protégée" : ""}
                            {c.alcoholBlocked
                              ? " ⛔ alcool interdit"
                              : c.alcoholRestricted
                                ? " ⚠ alcool restreint"
                                : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {asCity &&
                    (() => {
                      const city = findAsCity(asCity);
                      if (!city) return null;
                      return (
                        <div
                          className={`mt-2 text-xs px-3 py-2 rounded-lg leading-relaxed ${
                            city.status === "zone_protegee"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : city.status === "restreint"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {city.status === "open" &&
                            `✓ Marché ouvert. ${city.notes ?? "Publicité mobile sur flotte autorisée."}`}
                          {city.status === "restreint" && `⚠ Réglementé. ${city.notes ?? ""}`}
                          {city.status === "zone_protegee" &&
                            `⛔ Zone protégée. ${city.notes ?? ""}`}
                        </div>
                      );
                    })()}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("compliance.content_category_label")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={contentCategory}
                    onChange={(e) => setContentCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("compliance.content_category_placeholder")}</option>
                    {CONTENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.labelFr}
                      </option>
                    ))}
                  </select>
                  {contentCategory &&
                    (() => {
                      const city = findAsCity(asCity);
                      const result = checkAsContentCompliance(contentCategory, {
                        blocked: city?.alcoholBlocked,
                        restricted: city?.alcoholRestricted,
                      });
                      if (result.status === "restricted") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 leading-relaxed">
                            ⚠ {result.disclaimer}
                          </div>
                        );
                      }
                      if (result.status === "blocked") {
                        return (
                          <div className="mt-2 text-xs px-3 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 leading-relaxed">
                            ⛔ {result.reason}
                          </div>
                        );
                      }
                      return (
                        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ {t("compliance.as_content_ok")}
                        </p>
                      );
                    })()}
                </div>

                <p className="text-xs text-muted-foreground">{t("compliance.as_legal_note")}</p>
              </>
            )}
          </div>

          <Field label={t("advertiser.briefs.nouveau.field_title")}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Ex. Campagne street food Paris 11e"
            />
          </Field>

          <Field label={t("advertiser.briefs.nouveau.field_description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Marque, message clé, ton, contraintes, audience cible…"
            />
          </Field>

          <ContentChecker text={`${title} ${description} ${audience}`} />

          {/* ── Score qualité IA ────────────────────────────────────────── */}
          {(qualityLoading || qualityScore) && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs transition-all ${qualityLoading ? "border-border bg-secondary/20 animate-pulse" : qualityScore && qualityScore.global >= 7 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
            >
              {qualityLoading ? (
                <p className="text-muted-foreground">
                  {t("advertiser.briefs.nouveau.quality_loading")}
                </p>
              ) : qualityScore?.scores ? (
                <>
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="font-semibold text-sm">
                      {t("advertiser.briefs.nouveau.quality_title")}
                    </span>
                    <span
                      className={`text-xl font-bold ${qualityScore.global >= 7 ? "text-emerald-600" : qualityScore.global >= 5 ? "text-amber-600" : "text-destructive"}`}
                    >
                      {qualityScore.global}/10
                    </span>
                    <div className="flex gap-2 text-muted-foreground flex-wrap">
                      <span>
                        {t("advertiser.briefs.nouveau.quality_message")}{" "}
                        <strong className="text-foreground">
                          {qualityScore.scores.message}/10
                        </strong>
                      </span>
                      <span>
                        {t("advertiser.briefs.nouveau.quality_audience_label")}{" "}
                        <strong className="text-foreground">
                          {qualityScore.scores.audience}/10
                        </strong>
                      </span>
                      <span>
                        {t("advertiser.briefs.nouveau.quality_zone_label")}{" "}
                        <strong className="text-foreground">{qualityScore.scores.zone}/10</strong>
                      </span>
                    </div>
                  </div>
                  {(qualityScore.tips?.length ?? 0) > 0 && (
                    <ul className="space-y-0.5">
                      {qualityScore.tips?.map((tip, i) => (
                        <li key={i} className="text-muted-foreground">
                          💡 {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
          )}

          <Field label={t("advertiser.briefs.nouveau.field_vehicles")}>
            <button
              type="button"
              onClick={() => toggleType("camion_led")}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all mb-3 ${
                vehicleTypes.includes("camion_led")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-secondary"
              }`}
            >
              {t("advertiser.briefs.nouveau.vehicle_led_btn")}
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {t("advertiser.briefs.nouveau.vehicles_available")}
            </div>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.filter((vt) => vt.v !== "camion_led").map((vt) => {
                const blockedByBoxled =
                  adFormat === "boxled" && BOXLED_INCOMPATIBLE.includes(vt.v as VehicleKey);
                const isSelected = vehicleTypes.includes(vt.v);
                return (
                  <button
                    type="button"
                    key={vt.v}
                    disabled={blockedByBoxled}
                    title={
                      blockedByBoxled
                        ? t("advertiser.briefs.nouveau.boxled_incompatible_title")
                        : vt.tip
                    }
                    onClick={() => toggleType(vt.v)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      blockedByBoxled
                        ? "opacity-40 cursor-not-allowed bg-card border-border"
                        : isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-secondary"
                    }`}
                  >
                    {vtLabel(vt.v)}
                  </button>
                );
              })}
            </div>
            {adFormat === "boxled" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                {t("advertiser.briefs.nouveau.boxled_warning")}
              </p>
            )}
          </Field>

          {/* Aperçu automatique sur un véhicule réel disponible */}
          {vehicleTypes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">
                  {t("advertiser.briefs.nouveau.preview_label")}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    {t("advertiser.briefs.nouveau.preview_color_label")}
                  </label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-card"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    {t("advertiser.briefs.nouveau.preview_logo_label")}
                  </label>
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
              {previewSearching ? (
                <div className="h-48 rounded-xl bg-secondary/40 flex items-center justify-center animate-pulse">
                  <span className="text-sm text-muted-foreground">
                    {t("advertiser.briefs.nouveau.preview_searching")}
                  </span>
                </div>
              ) : previewVehicleId ? (
                <VehiclePhotoAdPreview
                  vehicleId={previewVehicleId}
                  brandColor={brandColor}
                  logoUrl={logoUrl}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-5 text-center text-sm text-muted-foreground">
                  <p>{t("advertiser.briefs.nouveau.preview_empty")}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {t("advertiser.briefs.nouveau.preview_empty_sub")}
                  </p>
                </div>
              )}
            </div>
          )}

          {vehicleTypes.includes("autre") && (
            <Field label={t("advertiser.briefs.nouveau.field_autre")}>
              <input
                type="text"
                maxLength={120}
                value={autreVehicleNote}
                onChange={(e) => setAutreVehicleNote(e.target.value)}
                placeholder="Ex. Rickshaw, bateau fluvial, camion brasserie…"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("advertiser.briefs.nouveau.autre_hint")}
              </p>
            </Field>
          )}

          <Field label={t("advertiser.briefs.nouveau.field_format")}>
            <div className="flex flex-wrap gap-2">
              {AD_FORMATS.map((f) => {
                const incompatible =
                  f.v === "boxled" &&
                  vehicleTypes.length > 0 &&
                  isFormatIncompatible(vehicleTypes, "boxled");
                return (
                  <button
                    type="button"
                    key={f.v}
                    disabled={incompatible}
                    title={
                      incompatible
                        ? t("advertiser.briefs.nouveau.boxled_vehicle_incompatible_title")
                        : fmtDesc(f.v, f.desc)
                    }
                    onClick={() => {
                      if (incompatible) return;
                      setAdFormat((cur) => (cur === f.v ? null : f.v));
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      incompatible
                        ? "opacity-40 cursor-not-allowed bg-card border-border line-through"
                        : adFormat === f.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-secondary"
                    }`}
                  >
                    {fmtLabel(f.v, f.l)}
                  </button>
                );
              })}
            </div>
            {isFormatIncompatible(vehicleTypes, "boxled") && vehicleTypes.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                {t("advertiser.briefs.nouveau.boxled_incompatible")}
              </p>
            )}
          </Field>

          <Field label={t("advertiser.briefs.nouveau.field_zone_map")}>
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

          <Field label={t("advertiser.briefs.nouveau.field_zones")}>
            <textarea
              value={zones}
              onChange={(e) => {
                setZones(e.target.value);
                setZoneSearchQuery(e.target.value); // only manual typing triggers geocoding
              }}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Tapez un quartier pour centrer la carte, ou dessinez sur la carte"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("advertiser.briefs.nouveau.zones_hint")}
            </p>
            {zonePolygon &&
              estimatedDays > 0 &&
              (() => {
                const est = estimateZoneBudget(
                  zonePolygon.areaKm2,
                  estimatedDays,
                  1,
                  zonePolygon.coordinates as [number, number][],
                );
                return (
                  <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                    <p className="font-medium">
                      {t("advertiser.briefs.nouveau.zone_budget_title")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {zonePolygon.areaKm2.toFixed(2)} km² × {estimatedDays} jour(s) ≈{" "}
                      <strong className="text-foreground">
                        {est.total.toLocaleString(i18n.language)} €
                      </strong>{" "}
                      ({est.perDay} €/jour · {est.ratePerKm2PerDay} €/km²/jour)
                    </p>
                    {est.denseMetro && (
                      <p className="mt-2 text-xs text-foreground">
                        {t("advertiser.briefs.nouveau.zone_dense", {
                          metro: est.denseMetro,
                          mult: est.multiplier,
                        })}
                      </p>
                    )}
                  </div>
                );
              })()}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("advertiser.briefs.nouveau.field_start")}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              />
            </Field>
            <Field label={t("advertiser.briefs.nouveau.field_end")}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              />
            </Field>
          </div>

          <LiveBudgetEstimator
            days={estimatedDays}
            vehicleCount={vehicleTypes.length}
            zonePolygon={zonePolygon}
          />

          {estimatedDays >= 1 && vehicleTypes.length >= 1 && (
            <AdvertiserBudgetEstimate
              zones={zones || zonePolygon?.detectedZones?.[0] || ""}
              days={estimatedDays}
              vehicleCount={vehicleTypes.length}
              vehicleTypes={vehicleTypes}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("advertiser.briefs.nouveau.field_budget")}>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              />
            </Field>
            <Field label={t("advertiser.briefs.nouveau.field_audience")}>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
                placeholder="Ex. 25-40 ans urbains"
              />
            </Field>
          </div>

          <Field label={t("advertiser.briefs.nouveau.field_creatives")}>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,video/*"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                setFiles(selected);
                void handleCreativeValidation(selected);
              }}
              className="w-full text-sm"
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("advertiser.briefs.nouveau.creatives_count", { count: files.length })}
              </p>
            )}
            {creativeValidating && (
              <div className="mt-2 flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 animate-pulse">
                <span className="inline-block w-3 h-3 border-2 border-violet-400/30 border-t-violet-500 rounded-full animate-spin" />
                {t("advertiser.briefs.nouveau.creatives_analyzing")}
              </div>
            )}
            {creativeValidation.length > 0 && !creativeValidating && (
              <div className="mt-2 space-y-2">
                {creativeValidation.map((r) => (
                  <div
                    key={r.name}
                    className={`rounded-lg border px-3 py-2 text-xs ${r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <span>{r.ok ? "✅" : "⚠️"}</span>
                      <span className="truncate max-w-[200px]">{r.name}</span>
                      <span
                        className={`ml-auto font-semibold ${r.score >= 70 ? "text-emerald-600" : r.score >= 50 ? "text-amber-600" : "text-destructive"}`}
                      >
                        {r.score}/100
                      </span>
                    </div>
                    {(r.issues?.length ?? 0) > 0 && (
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {r.issues?.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">{t("advertiser.briefs.nouveau.ip_notice")}</strong>{" "}
            {t("advertiser.briefs.nouveau.ip_notice_body")}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {showGuestSignup && !userId && (
            <div
              id="guest-signup-section"
              className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4"
            >
              <div>
                <p className="font-semibold text-sm">
                  {t("advertiser.briefs.nouveau.guest_title")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("advertiser.briefs.nouveau.guest_desc")}
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("advertiser.briefs.nouveau.guest_email")}
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("advertiser.briefs.nouveau.guest_password")}
                  </label>
                  <input
                    type="password"
                    value={guestPassword}
                    onChange={(e) => setGuestPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("advertiser.briefs.nouveau.guest_signin_prefix")}{" "}
                <Link to="/advertiser/inscription" className="text-primary underline">
                  {t("advertiser.briefs.nouveau.guest_signin_link")}
                </Link>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading
              ? t("advertiser.briefs.nouveau.submit_loading")
              : showGuestSignup && !userId
                ? t("advertiser.briefs.nouveau.submit_create_account")
                : userId
                  ? t("advertiser.briefs.nouveau.submit_publish")
                  : t("advertiser.briefs.nouveau.submit_continue")}
          </button>
        </form>
      </main>
    </div>
  );
}

function ContentChecker({ text }: { text: string }) {
  const { t } = useTranslation();
  const [match, setMatch] = useState<ReturnType<typeof findForbiddenMatch>>(null);
  const [checked, setChecked] = useState(false);
  const safeText = text ?? "";

  useEffect(() => {
    setChecked(false);
    const id = setTimeout(() => {
      setMatch(findForbiddenMatch(safeText.trim()));
      setChecked(true);
    }, 400);
    return () => clearTimeout(id);
  }, [safeText]);

  if (!checked || safeText.trim().length < 5) return null;

  if (match) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 space-y-2">
        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
          ⛔ Contenu non conforme — {match.category}
        </p>
        <p className="text-xs text-destructive/80">
          {t("advertiser.briefs.nouveau.content_nok_term")} <strong>« {match.keyword} »</strong>{" "}
          {t("advertiser.briefs.nouveau.content_nok_forbidden")}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{match.advice}</p>
        <p className="text-xs font-medium text-destructive">
          {t("advertiser.briefs.nouveau.content_nok_warning")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2">
      <span className="text-emerald-500 text-sm">✓</span>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        {t("advertiser.briefs.nouveau.content_ok")}
      </p>
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
  const { t, i18n } = useTranslation();
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
    ? estimateZoneBudget(zonePolygon.areaKm2, d, 1, zonePolygon.coordinates as [number, number][])
        .denseMetro
    : null;

  const floorForV = MIN_EUR_PER_DAY * d * v;
  const approxForV = zonePolygon
    ? estimateZoneBudget(zonePolygon.areaKm2, d, v, zonePolygon.coordinates as [number, number][])
        .total
    : floorForV;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-semibold text-sm">{t("advertiser.briefs.nouveau.budget_title")}</p>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {zonePolygon
            ? t("advertiser.briefs.nouveau.budget_zone_drawn")
            : t("advertiser.briefs.nouveau.budget_realtime")}
        </span>
      </div>

      {days <= 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("advertiser.briefs.nouveau.budget_select_dates")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 font-medium">
                    {t("advertiser.briefs.nouveau.budget_col_vehicles")}
                  </th>
                  <th className="text-right py-1.5 font-medium">
                    {t("advertiser.briefs.nouveau.budget_col_total")}
                  </th>
                  <th className="text-right py-1.5 font-medium">
                    {t("advertiser.briefs.nouveau.budget_col_per_day")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ n, total }) => (
                  <tr
                    key={n}
                    className={`border-b border-border/40 ${n === v ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    <td className="py-2">
                      {t("advertiser.briefs.nouveau.budget_vehicle", { count: n })}
                      {n === v && vehicleCount > 0 && (
                        <span className="ml-2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {t("advertiser.briefs.nouveau.budget_selected")}
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2">{total.toLocaleString(i18n.language)} €</td>
                    <td className="text-right py-2 text-xs">{Math.round(total / d)} €/j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isDense && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("advertiser.briefs.nouveau.budget_dense", { metro: isDense })}
            </p>
          )}

          <div className="rounded-lg bg-background/60 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p>
              • Estimation basée sur{" "}
              {zonePolygon
                ? `${zonePolygon.areaKm2.toFixed(1)} km² dessinés`
                : t("advertiser.briefs.nouveau.budget_note_floor")}{" "}
              × {d} jour{d > 1 ? "s" : ""}.
            </p>
            <p>• {t("advertiser.briefs.nouveau.budget_note_2")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/advertiser/portefeuille"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
            >
              {t("advertiser.briefs.nouveau.budget_prepare", {
                amount: approxForV.toLocaleString(i18n.language),
              })}
            </Link>
            <Link
              to="/advertiser/pack"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {t("advertiser.briefs.nouveau.budget_buy_pack")}
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
