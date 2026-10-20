import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { useServerFn } from "@tanstack/react-start";
import { generateVehicleSuggestion } from "@/lib/ai/vehicle-assistant.functions";
import { AiAssistantPanel } from "@/components/shared/AiAssistantPanel";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/owner/vehicules/$vehicleId")({
  head: () => ({
    meta: [
      { title: "Modifier le véhicule — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EditVehiclePage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const CONDITION_VALUES = ["excellent", "bon", "moyen", "mauvais"] as const;
type ConditionValue = (typeof CONDITION_VALUES)[number];

function EditVehiclePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { vehicleId } = Route.useParams();

  const [loadError, setLoadError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState("");

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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSessionExpired, setAiSessionExpired] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);

  const callVehicleAi = useServerFn(generateVehicleSuggestion);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/owner/inscription" });
        return;
      }

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

      const { data: vehicle, error: vErr } = await supabase
        .from("vehicles")
        .select(
          "id, type, condition, name, license_plate, brand, model, color, description, surface_m2, km_per_day, zones, price_per_day",
        )
        .eq("id", vehicleId)
        .eq("owner_id", prof.id)
        .maybeSingle();

      if (vErr || !vehicle) {
        setLoadError(t("owner.vehicules.modifier.not_found"));
        setPageLoading(false);
        return;
      }

      setVehicleType(vehicle.type as string);
      setCondition((vehicle.condition as ConditionValue) ?? "bon");
      setName((vehicle.name as string) ?? "");
      setLicensePlate((vehicle.license_plate as string) ?? "");
      setBrand((vehicle.brand as string) ?? "");
      setVehicleModel((vehicle.model as string) ?? "");
      setColor((vehicle.color as string) ?? "");
      setDescription((vehicle.description as string) ?? "");
      setSurface(vehicle.surface_m2 != null ? String(vehicle.surface_m2) : "");
      setKm(vehicle.km_per_day != null ? String(vehicle.km_per_day) : "");
      setZones(Array.isArray(vehicle.zones) ? (vehicle.zones as string[]).join(", ") : "");
      setPrice(vehicle.price_per_day != null ? String(vehicle.price_per_day) : "");
      setPageLoading(false);
    })();
  }, [navigate, vehicleId]);

  const handleAiGenerate = async () => {
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
          vehicleType: vehicleType !== "autre" ? vehicleType : undefined,
        },
      });
      if (!res.ok) {
        if (res.code === "UNAUTHORIZED") {
          setAiSessionExpired(true);
          return;
        }
        setAiError(res.message);
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
      if (suggestion.price_per_day) {
        setPrice(String(suggestion.price_per_day));
        filled.push("prix");
      }
      setAiFilled(filled);
      setAiPanelOpen(false);
    } catch {
      setAiError(t("owner.vehicules.modifier.ai_generate_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;
    setError("");
    if (condition === "mauvais") {
      setError(t("owner.vehicules.nouveau.error_bad_condition_submit"));
      return;
    }
    setLoading(true);
    const { error: upErr } = await supabase
      .from("vehicles")
      .update({
        condition,
        name,
        license_plate: licensePlate.trim().toUpperCase() || null,
        brand: brand.trim() || null,
        model: vehicleModel.trim() || null,
        color: color.trim() || null,
        description: description || null,
        surface_m2: surface ? Number(surface) : null,
        km_per_day: km ? Number(km) : null,
        zones: zones
          ? zones
              .split(",")
              .map((z) => z.trim())
              .filter(Boolean)
          : [],
        price_per_day: Number(price),
      })
      .eq("id", vehicleId)
      .eq("owner_id", ownerId);

    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }
    navigate({ to: "/owner" });
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">
          {t("owner.vehicules.modifier.loading")}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive text-sm">{loadError}</p>
          <Link to="/owner" className="text-xs text-muted-foreground underline">
            {t("owner.vehicules.modifier.back")}
          </Link>
        </div>
      </div>
    );
  }

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
          {t("owner.vehicules.modifier.back")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">
            {t("owner.vehicules.modifier.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{t("owner.vehicules.modifier.desc")}</p>

          <div className="mb-6">
            <AiAssistantPanel
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              context={aiContext}
              onContextChange={setAiContext}
              onGenerate={handleAiGenerate}
              loading={aiLoading}
              error={aiError}
              sessionExpired={aiSessionExpired}
              sessionExpiredHref="/owner/inscription"
              title={t("owner.vehicules.modifier.ai_panel_title")}
              description={t("owner.vehicules.modifier.ai_panel_desc")}
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
                {t("owner.vehicules.nouveau.condition_label")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_VALUES.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setCondition(v)}
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
              </p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
              {t("owner.vehicules.modifier.photos_readonly_hint")}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading
                ? t("owner.vehicules.nouveau.submitting")
                : t("owner.vehicules.modifier.submit")}
            </button>

            <DeleteVehicleButton vehicleId={vehicleId} />
          </form>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl font-bold mb-4">
            {t("owner.vehicules.calendar.title")}
          </h2>
          <VehicleCalendar vehicleId={vehicleId} />
        </div>
      </div>
    </div>
  );
}

function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
    if (!error) {
      navigate({ to: "/owner" });
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-3">
        <p className="text-sm font-semibold text-destructive">
          {t("owner.vehicules.modifier.delete_confirm")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2 text-sm font-semibold hover:bg-destructive/90 transition disabled:opacity-60"
          >
            {deleting
              ? t("owner.vehicules.modifier.deleting")
              : t("owner.vehicules.modifier.delete_confirm_yes")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-muted transition disabled:opacity-60"
          >
            {t("owner.vehicules.modifier.delete_confirm_no")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full rounded-lg border border-destructive/40 text-destructive py-3 text-sm font-semibold hover:bg-destructive/10 transition"
    >
      {t("owner.vehicules.modifier.delete")}
    </button>
  );
}

function VehicleCalendar({ vehicleId }: { vehicleId: string }) {
  const { t, i18n } = useTranslation();
  type Booking = {
    id: string;
    start_date: string | null;
    end_date: string | null;
    days_count: number | null;
    spot_name: string;
    status: string;
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calLoading, setCalLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaign_requests")
        .select("id, start_date, end_date, days_count, spot_name, status")
        .eq("vehicle_id", vehicleId)
        .in("status", ["approved", "paid", "completed"])
        .order("start_date", { ascending: false });
      setBookings((data ?? []) as Booking[]);
      setCalLoading(false);
    })();
  }, [vehicleId]);

  if (calLoading)
    return <div className="text-sm text-muted-foreground animate-pulse">{t("common.loading")}</div>;

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
        {t("owner.vehicules.calendar.empty")}
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    approved: "bg-primary/10 text-primary",
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  };

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{b.spot_name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {b.start_date ? new Date(b.start_date).toLocaleDateString(i18n.language) : "—"}
                {b.start_date && b.end_date && " → "}
                {b.end_date ? new Date(b.end_date).toLocaleDateString(i18n.language) : ""}
                {b.days_count != null && (
                  <> · {t("owner.vehicules.calendar.days", { count: b.days_count })}</>
                )}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${statusColors[b.status] ?? "bg-secondary text-foreground"}`}
            >
              {t(`owner.vehicules.calendar.status_${b.status}`, b.status)}
            </span>
          </div>
        </div>
      ))}
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
