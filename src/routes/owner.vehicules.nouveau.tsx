import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { useServerFn } from "@tanstack/react-start";
import { estimateVehicle } from "@/lib/fleet/vehicle-estimate.functions";
import { generateVehicleSuggestion } from "@/lib/ai/vehicle-assistant.functions";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { RouteError } from "@/components/app/RouteError";
import { resizeImageFile } from "@/lib/images/resize";
import { captureError } from "@/lib/sentry";

export const Route = createFileRoute("/owner/vehicules/nouveau")({
  head: () => ({
    meta: [
      { title: "Ajouter un véhicule — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewVehiclePage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const VEHICLE_TYPE_VALUES = [
  "camion_led",
  "food_truck",
  "van",
  "taxi",
  "scooter",
  "velo_cargo",
  "velo_remorque",
  "triporteur",
  "tutuk",
  "voiture",
] as const;

const CONDITION_VALUES = ["excellent", "bon", "moyen", "mauvais"] as const;
type ConditionValue = (typeof CONDITION_VALUES)[number];

function NewVehiclePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState("food_truck");
  const [autreDescription, setAutreDescription] = useState("");
  const [condition, setCondition] = useState<ConditionValue>("bon");
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState("");
  const [km, setKm] = useState("");
  const [zones, setZones] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<null | {
    suggested_price_min: number;
    suggested_price_max: number;
    estimated_impressions_per_day: number;
    photo_match: "ok" | "doubtful" | "mismatch" | "unverified";
    photo_notes: string;
    condition_alert: string | null;
    ai_generated_detected: boolean;
    ai_generated_notes: string;
    recommendation: string;
    uploaded_urls: string[];
  }>(null);
  const [pastedHint, setPastedHint] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const callEstimate = useServerFn(estimateVehicle);
  const callVehicleAi = useServerFn(generateVehicleSuggestion);

  const MAX_PHOTOS = 5;
  const MAX_PHOTO_SIZE = 30 * 1024 * 1024; // 30 MB

  const applyPhotos = (incoming: File[], current: File[]): File[] => {
    const tooLarge: string[] = [];
    const valid: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_PHOTO_SIZE) {
        tooLarge.push(`${f.name} (${t("owner.vehicules.nouveau.max_photo_size")})`);
      } else {
        valid.push(f);
      }
    }
    const merged = [...current, ...valid];
    const overflow = merged.length > MAX_PHOTOS ? merged.slice(MAX_PHOTOS).map((f) => f.name) : [];
    const final = merged.slice(0, MAX_PHOTOS);
    const rejected = [...tooLarge, ...overflow];
    setError(
      rejected.length > 0
        ? t("owner.vehicules.nouveau.error_photos_ignored", { files: rejected.join(", ") })
        : "",
    );
    return final;
  };

  // Coller une image depuis le presse-papier (Ctrl+V) directement dans la zone photos
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (!imageItems.length) return;
      e.preventDefault();
      const newFiles = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (!newFiles.length) return;
      setFiles((prev) => applyPhotos(newFiles, prev));
      setEstimate(null);
      setPastedHint(true);
      setTimeout(() => setPastedHint(false), 3000);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/owner/inscription" });
        return;
      }
      setUserId(session.user.id);
      const { data: prof } = await supabase
        .from("owner_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!prof) {
        navigate({ to: "/owner/inscription" });
        return;
      }
      setOwnerId(prof.id);
    })();
  }, [navigate]);

  const uploadPhotos = async (): Promise<string[]> => {
    if (!userId) return [];
    const urls: string[] = [];
    for (const file of files.slice(0, 5)) {
      const resized = await resizeImageFile(file, 1600, 0.85);
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("vehicle-photos").upload(path, resized);
      if (upErr) throw new Error(`Upload : ${upErr.message}`);
      urls.push(path);
    }
    return urls;
  };

  const pathsToSignedUrls = async (paths: string[]): Promise<string[]> => {
    return Promise.all(
      paths.map(async (p) => {
        if (p.startsWith("http")) return p;
        const { data } = await supabase.storage.from("vehicle-photos").createSignedUrl(p, 3600);
        return data?.signedUrl ?? p;
      }),
    );
  };

  const runEstimate = async () => {
    setError("");
    if (condition === "mauvais") {
      setError(t("owner.vehicules.nouveau.error_bad_condition"));
      return;
    }
    if (files.length === 0) {
      setError(t("owner.vehicules.nouveau.error_need_photo"));
      return;
    }
    setEstimating(true);
    try {
      const paths = estimate?.uploaded_urls ?? (await uploadPhotos());
      const signedUrls = await pathsToSignedUrls(paths);
      const res = await callEstimate({
        data: {
          type,
          condition,
          ...(type === "autre" && autreDescription.trim()
            ? { vehicle_description: autreDescription.trim() }
            : {}),
          surface_m2: surface ? Number(surface) : null,
          km_per_day: km ? Number(km) : null,
          zones: zones
            ? zones
                .split(",")
                .map((z) => z.trim())
                .filter(Boolean)
            : [],
          price_per_day: price ? Number(price) : null,
          photo_urls: signedUrls,
        },
      });
      setEstimate({ ...res, uploaded_urls: paths });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Upload"))
        captureError(e, "upload", { flow: "vehicle_photo" });
      const msg = e instanceof Error ? e.message : "";
      const isTechnical = /API_KEY|secret|token|supabase|postgres|prisma|internal server/i.test(
        msg,
      );
      setError(isTechnical || !msg ? t("owner.vehicules.nouveau.error_estimate_generic") : msg);
    } finally {
      setEstimating(false);
    }
  };

  const handleVehicleAiGenerate = async () => {
    setAiError("");
    setAiSessionExpired(false);
    if (aiContext.trim().length < 10) {
      setAiError("Décrivez votre véhicule en au moins 10 caractères.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await callVehicleAi({
        data: {
          ownerContext: aiContext.trim(),
          vehicleType: type !== "autre" ? type : undefined,
        },
      });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") {
          setAiSessionExpired(true);
          return;
        }
        const isGateway = /503|502|upstream|temporarily unavailable|gateway/i.test(res.message ?? "");
        setAiError(
          isGateway
            ? t("owner.vehicules.nouveau.ai_error_gateway")
            : res.message,
        );
        return;
      }
      const { suggestion } = res;
      const filled: string[] = [];
      if (suggestion.name) {
        setName(suggestion.name);
        filled.push("nom");
      }
      if (suggestion.description) {
        setDescription(suggestion.description);
        filled.push("description");
      }
      if (suggestion.surface_m2) {
        setSurface(String(suggestion.surface_m2));
        filled.push("surface");
      }
      if (suggestion.km_per_day) {
        setKm(String(suggestion.km_per_day));
        filled.push("km/jour");
      }
      if (suggestion.zones) {
        setZones(suggestion.zones);
        filled.push("zones");
      }
      if (suggestion.price_per_day && !estimate) {
        setPrice(String(suggestion.price_per_day));
        filled.push("prix");
      }
      setAiFilled(filled);
      setAiPanelOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const isGateway = /503|502|upstream|temporarily unavailable|gateway/i.test(msg);
      setAiError(
        isGateway
          ? t("owner.vehicules.nouveau.ai_error_gateway")
          : t("owner.vehicules.nouveau.ai_error_generic"),
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !userId) return;
    setError("");
    if (condition === "mauvais") {
      setError(t("owner.vehicules.nouveau.error_bad_condition_submit"));
      return;
    }
    if (type === "autre" && !autreDescription.trim()) {
      setError(t("owner.vehicules.nouveau.error_autre_desc"));
      return;
    }
    if (estimate?.ai_generated_detected) {
      setError(t("owner.vehicules.nouveau.error_ai_photo"));
      return;
    }
    if (
      estimate &&
      estimate.suggested_price_max > 0 &&
      Number(price) > estimate.suggested_price_max * 0.7
    ) {
      const maxAcceptable = Math.floor(estimate.suggested_price_max * 0.7);
      const minAcceptable = Math.floor(estimate.suggested_price_min * 0.7);
      setError(
        t("owner.vehicules.nouveau.error_price_too_high", {
          aiMin: estimate.suggested_price_min,
          aiMax: estimate.suggested_price_max,
          ownerMin: minAcceptable,
          ownerMax: maxAcceptable,
        }),
      );
      return;
    }

    setLoading(true);
    try {
      const photoUrls = estimate?.uploaded_urls ?? (await uploadPhotos());
      const { error: insErr } = await supabase.from("vehicles").insert({
        owner_id: ownerId,
        type: (type === "camion_led" ? "camion_boxled" : type) as
          | "camion_boxled"
          | "food_truck"
          | "van"
          | "taxi"
          | "scooter"
          | "velo_cargo"
          | "velo_remorque"
          | "triporteur"
          | "tutuk"
          | "voiture"
          | "autre",
        condition,
        name,
        license_plate: licensePlate.trim().toUpperCase() || null,
        brand: brand.trim() || null,
        model: vehicleModel.trim() || null,
        color: color.trim() || null,
        description:
          type === "autre" && autreDescription.trim()
            ? `[Véhicule : ${autreDescription.trim()}]${description ? `\n\n${description}` : ""}`
            : description || null,
        format_publicitaire: type === "camion_led" ? "boxled" : null,
        surface_m2: surface ? Number(surface) : null,
        km_per_day: km ? Number(km) : null,
        zones: zones
          ? zones
              .split(",")
              .map((z) => z.trim())
              .filter(Boolean)
          : [],
        price_per_day: Number(price),
        photos: photoUrls,
        ai_verification: estimate
          ? {
              photo_match: estimate.photo_match,
              photo_notes: estimate.photo_notes,
              condition_alert: estimate.condition_alert,
              ai_generated_detected: estimate.ai_generated_detected,
              ai_generated_notes: estimate.ai_generated_notes,
              suggested_price_min: estimate.suggested_price_min,
              suggested_price_max: estimate.suggested_price_max,
              estimated_impressions_per_day: estimate.estimated_impressions_per_day,
              checked_at: new Date().toISOString(),
            }
          : null,
      });
      if (insErr) {
        setError(insErr.message);
        setLoading(false);
        return;
      }
      navigate({ to: "/owner" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link
          to="/owner"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {t("owner.vehicules.nouveau.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">
            {t("owner.vehicules.nouveau.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{t("owner.vehicules.nouveau.desc")}</p>

          {/* AI assistant panel */}
          <div className="mb-6">
            <AiAssistantPanel
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              context={aiContext}
              onContextChange={setAiContext}
              onGenerate={handleVehicleAiGenerate}
              loading={aiLoading}
              error={aiError}
              sessionExpired={aiSessionExpired}
              sessionExpiredHref="/owner/inscription"
              title={t("owner.vehicules.nouveau.ai_panel_title")}
              description={t("owner.vehicules.nouveau.ai_panel_desc")}
              placeholder={t("owner.vehicules.nouveau.ai_placeholder")}
              generateLabel={t("owner.vehicules.nouveau.ai_generate")}
              generateLoadingLabel={t("owner.vehicules.nouveau.ai_generating")}
              filledMessage={
                aiFilled.length > 0
                  ? t("owner.vehicules.nouveau.ai_filled", { fields: aiFilled.join(", ") })
                  : undefined
              }
              onDismissFilled={() => setAiFilled([])}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("owner.vehicules.nouveau.vehicle_type_label")}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <optgroup label={t("owner.vehicules.nouveau.group_vehicles")}>
                  {VEHICLE_TYPE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {t(`vehicle_types.${v}`)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("owner.vehicules.nouveau.group_other")}>
                  <option value="autre">{t("vehicle_types.autre")}</option>
                </optgroup>
              </select>
            </div>
            {type === "autre" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t("owner.vehicules.nouveau.autre_type_label")}
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={autreDescription}
                  onChange={(e) => setAutreDescription(e.target.value)}
                  placeholder={t("owner.vehicules.nouveau.autre_type_placeholder")}
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("owner.vehicules.nouveau.autre_type_hint")}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("owner.vehicules.nouveau.condition_label")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_VALUES.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => {
                      setCondition(v);
                      setEstimate(null);
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-left transition ${
                      condition === v
                        ? v === "mauvais"
                          ? "border-destructive bg-destructive/10"
                          : "border-primary bg-primary/10"
                        : "border-border bg-input hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-semibold">
                      {t(`owner.vehicules.nouveau.condition_${v}`)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t(`owner.vehicules.nouveau.condition_${v}_desc`)}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("owner.vehicules.nouveau.condition_warning")}
              </p>
            </div>

            <Field
              label={t("owner.vehicules.nouveau.name_label")}
              value={name}
              onChange={setName}
              required
              placeholder={t("owner.vehicules.nouveau.name_placeholder")}
            />

            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {t("owner.vehicules.nouveau.id_section_title")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("owner.vehicules.nouveau.id_section_desc")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t("owner.vehicules.nouveau.plate_label")}
                  value={licensePlate}
                  onChange={setLicensePlate}
                  placeholder={t("owner.vehicules.nouveau.plate_placeholder")}
                />
                <Field
                  label={t("owner.vehicules.nouveau.color_label")}
                  value={color}
                  onChange={setColor}
                  placeholder={t("owner.vehicules.nouveau.color_placeholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t("owner.vehicules.nouveau.brand_label")}
                  value={brand}
                  onChange={setBrand}
                  placeholder={t("owner.vehicules.nouveau.brand_placeholder")}
                />
                <Field
                  label={t("owner.vehicules.nouveau.model_label")}
                  value={vehicleModel}
                  onChange={setVehicleModel}
                  placeholder={t("owner.vehicules.nouveau.model_placeholder")}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("owner.vehicules.nouveau.description_label")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t("owner.vehicules.nouveau.description_placeholder")}
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("owner.vehicules.nouveau.description_hint")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("owner.vehicules.nouveau.surface_label")}
                value={surface}
                onChange={setSurface}
                type="number"
              />
              <Field
                label={t("owner.vehicules.nouveau.km_label")}
                value={km}
                onChange={setKm}
                type="number"
                placeholder={t("owner.vehicules.nouveau.km_placeholder")}
                hint={t("owner.vehicules.nouveau.km_hint")}
              />
            </div>
            <Field
              label={t("owner.vehicules.nouveau.zones_label")}
              value={zones}
              onChange={setZones}
              placeholder={t("owner.vehicules.nouveau.zones_placeholder")}
              hint={t("owner.vehicules.nouveau.zones_hint")}
            />
            <div>
              <Field
                label={t("owner.vehicules.nouveau.price_label")}
                value={price}
                onChange={setPrice}
                type="number"
                required
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("owner.vehicules.nouveau.price_hint")}
                {estimate && estimate.suggested_price_max > 0 && (
                  <>
                    {" "}
                    {t("owner.vehicules.nouveau.price_range_hint", {
                      min: Math.floor(estimate.suggested_price_min * 0.7),
                      max: Math.floor(estimate.suggested_price_max * 0.7),
                    })}
                  </>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("owner.vehicules.nouveau.photos_label")}
              </label>
              <div
                className="relative rounded-xl border-2 border-dashed border-border bg-secondary/20 hover:bg-secondary/30 transition-colors"
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData?.items ?? []);
                  const imageItems = items.filter((item) => item.type.startsWith("image/"));
                  if (!imageItems.length) return;
                  e.preventDefault();
                  const newFiles = imageItems
                    .map((i) => i.getAsFile())
                    .filter((f): f is File => f !== null);
                  setFiles((prev) => applyPhotos(newFiles, prev));
                  setEstimate(null);
                  setPastedHint(true);
                  setTimeout(() => setPastedHint(false), 3000);
                }}
              >
                <label className="flex flex-col items-center justify-center gap-2 py-5 cursor-pointer">
                  <span className="text-2xl">📷</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {t("owner.vehicules.nouveau.photos_choose")}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {t("owner.vehicules.nouveau.photos_drag")}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-card border border-border">
                    <kbd className="text-[10px] font-mono font-bold text-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                      Ctrl
                    </kbd>
                    <span className="text-[10px] text-muted-foreground">+</span>
                    <kbd className="text-[10px] font-mono font-bold text-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                      V
                    </kbd>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {t("owner.vehicules.nouveau.photos_paste")}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      setFiles((prev) => applyPhotos(picked, prev));
                      setEstimate(null);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                </label>
                {pastedHint && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-primary rounded-xl pointer-events-none">
                    <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-full shadow-lg animate-pulse">
                      {t("owner.vehicules.nouveau.photos_pasted")}
                    </span>
                  </div>
                )}
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs bg-secondary rounded-lg px-2.5 py-1.5"
                    >
                      <span>🖼</span>
                      <span className="font-medium truncate max-w-[140px]">
                        {f.name || `Image collée ${i + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFiles((prev) => prev.filter((_, j) => j !== i));
                          setEstimate(null);
                        }}
                        className="text-muted-foreground hover:text-destructive ml-1 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("owner.vehicules.nouveau.photos_hint")}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("owner.vehicules.nouveau.photos_3d_hint")}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold">
                    {t("owner.vehicules.nouveau.estimate_title")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("owner.vehicules.nouveau.estimate_desc")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runEstimate}
                  disabled={estimating || condition === "mauvais"}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60 whitespace-nowrap"
                >
                  {estimating
                    ? t("owner.vehicules.nouveau.estimating")
                    : t("owner.vehicules.nouveau.estimate_btn")}
                </button>
              </div>
              {estimate && (
                <div className="space-y-2 text-sm mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-card p-2.5">
                      <div className="text-[11px] text-muted-foreground uppercase">
                        {t("owner.vehicules.nouveau.estimate_market_price")}
                      </div>
                      <div className="font-semibold">
                        {estimate.suggested_price_min}–{estimate.suggested_price_max} €/j
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-2.5">
                      <div className="text-[11px] text-muted-foreground uppercase">
                        {t("owner.vehicules.nouveau.estimate_impressions")}
                      </div>
                      <div className="font-semibold">
                        {estimate.estimated_impressions_per_day.toLocaleString(i18n.language)} /j
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-2.5 text-xs ${
                      estimate.photo_match === "ok"
                        ? "bg-signal/10 text-signal"
                        : estimate.photo_match === "doubtful"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : estimate.photo_match === "mismatch"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <strong>{t("owner.vehicules.nouveau.estimate_photo_label")} </strong>
                    {estimate.photo_match === "ok" &&
                      t("owner.vehicules.nouveau.estimate_photo_ok")}
                    {estimate.photo_match === "doubtful" &&
                      t("owner.vehicules.nouveau.estimate_photo_doubtful")}
                    {estimate.photo_match === "mismatch" &&
                      t("owner.vehicules.nouveau.estimate_photo_mismatch")}
                    {estimate.photo_match === "unverified" &&
                      t("owner.vehicules.nouveau.estimate_photo_unverified")}
                    {estimate.photo_notes && (
                      <span className="block mt-1 opacity-80">{estimate.photo_notes}</span>
                    )}
                  </div>
                  {estimate.condition_alert && (
                    <div className="rounded-lg bg-destructive/10 text-destructive p-2.5 text-xs">
                      ⚠️ {estimate.condition_alert}
                    </div>
                  )}
                  {estimate.ai_generated_detected && (
                    <div className="rounded-lg bg-destructive/15 border border-destructive/40 text-destructive p-3 text-xs space-y-2">
                      <div className="font-semibold text-sm">
                        🚫 {t("owner.vehicules.nouveau.estimate_ai_detected")}
                      </div>
                      {estimate.ai_generated_notes && (
                        <div className="bg-destructive/10 rounded p-2 leading-relaxed">
                          <strong>{t("owner.vehicules.nouveau.estimate_ai_reason_label")}</strong>{" "}
                          {estimate.ai_generated_notes}
                        </div>
                      )}
                      <div className="text-destructive/80">
                        {t("owner.vehicules.nouveau.estimate_ai_upload")}
                      </div>
                    </div>
                  )}
                  {estimate.suggested_price_max > 0 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                      <div>
                        <strong>{t("owner.vehicules.nouveau.estimate_owner_remun")}</strong>{" "}
                        {Math.floor(estimate.suggested_price_min * 0.7)}–
                        {Math.floor(estimate.suggested_price_max * 0.7)} €/j
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {t("owner.vehicules.nouveau.estimate_commission")}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPrice(String(Math.floor(estimate.suggested_price_max * 0.7)));
                          setError("");
                        }}
                        className="mt-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium hover:bg-primary/90 transition"
                      >
                        {t("owner.vehicules.nouveau.estimate_use_price", {
                          price: Math.floor(estimate.suggested_price_max * 0.7),
                        })}
                      </button>
                    </div>
                  )}
                  {estimate.recommendation && (
                    <div className="text-xs text-muted-foreground italic">
                      💡 {estimate.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
              {t("owner.vehicules.nouveau.ip_notice")}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading
                ? t("owner.vehicules.nouveau.submitting")
                : t("owner.vehicules.nouveau.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
