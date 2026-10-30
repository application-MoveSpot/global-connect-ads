import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { ProviderSubscriptionCard } from "@/components/provider/ProviderSubscriptionCard";
import { RouteError } from "@/components/app/RouteError";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";
import { ProviderQuoteReview } from "@/components/provider/ProviderQuoteReview";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/provider/")({
  head: () => ({
    meta: [
      { title: "Espace provider — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Profile = {
  user_id: string;
  company: string;
  full_name: string;
  status: string;
  admin_notes: string | null;
  siret: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  services: string[] | null;
  coverage_areas: string[] | null;
  pricing_info: string | null;
  logo_url: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_period_end: string | null;
  pose_location_types: string[];
};

type Quote = {
  id: string;
  advertiser_id: string;
  service_type: string;
  vehicle_type: string | null;
  vehicle_id: string | null;
  format: string | null;
  quantity: number | null;
  deadline: string | null;
  zone: string | null;
  message: string;
  status: string;
  quoted_price_cents: number | null;
  quoted_message: string | null;
  impossible_reason: string | null;
  impossible_photos: string[];
  impossible_at: string | null;
  created_at: string;
  ai_brief_id: string | null;
};

type VehicleId = {
  license_plate: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  name: string;
  type: string;
  photos: string[] | null;
};

function ProviderDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, VehicleId>>({});
  const [impossibleModal, setImpossibleModal] = useState<{ open: boolean; quoteId: string | null }>(
    { open: false, quoteId: null },
  );

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/provider/connexion" });
      return;
    }
    const { data: p } = await supabase
      .from("provider_profiles")
      .select(
        "user_id, company, full_name, status, admin_notes, siret, email, phone, website, description, services, coverage_areas, pricing_info, logo_url, stripe_subscription_status, stripe_subscription_period_end, pose_location_types",
      )
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!p) {
      navigate({ to: "/provider/inscription" });
      return;
    }
    setProfile(p as Profile);
    const { data: qs } = await supabase
      .from("service_quotes")
      .select("*")
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });
    const quoteList = (qs as Quote[]) ?? [];
    setQuotes(quoteList);

    // Fetch identification data for quoted vehicles
    const vehicleIds = [
      ...new Set(quoteList.map((q) => q.vehicle_id).filter((id): id is string => !!id)),
    ];
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, license_plate, brand, model, color, name, type, photos")
        .in("id", vehicleIds);
      const map: Record<string, VehicleId> = {};
      for (const v of vehicles ?? []) map[v.id] = v as VehicleId;
      setVehicleMap(map);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const openImpossibleModal = (id: string) => setImpossibleModal({ open: true, quoteId: id });

  const submitImpossible = async (reason: string, files: File[]) => {
    const { quoteId } = impossibleModal;
    if (!quoteId) return;
    const session = await getOrRefreshSession();
    const uid = session?.user.id;
    if (!uid) return;

    const photoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${uid}/${quoteId}/photo-${i + 1}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("pose-impossible")
        .upload(path, file, { upsert: true });
      if (!error) {
        const { data: signed } = await supabase.storage
          .from("pose-impossible")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed) photoUrls.push(signed.signedUrl);
      }
    }

    await supabase
      .from("service_quotes")
      .update({
        status: "impossible_pending",
        impossible_reason: reason,
        impossible_photos: photoUrls,
        impossible_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    setImpossibleModal({ open: false, quoteId: null });
    await load();
  };

  if (loading || !profile)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-2 border-t-orange-400 border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile.company}
            </span>
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram MoveSpot"
              className="rounded-full p-2 hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <Link
              to="/provider/tracking"
              className="text-sm rounded-full border border-primary/30 bg-primary/5 text-primary px-4 py-2 hover:bg-primary/10 transition flex items-center gap-1.5"
            >
              📍 {t("provider.tracking.nav_btn")}
            </Link>
            <Link
              to="/provider/profil"
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("profile.title")}
            </Link>
            <Link
              to="/parametres"
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("common.settings")}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("provider.dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("provider.dashboard.subtitle")}</p>
          </div>
          <StatusBadge status={profile.status} />
        </div>

        {profile.status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            {t("provider.dashboard.pending_notice")}
          </div>
        )}
        {profile.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {t("provider.dashboard.rejected_notice")}{" "}
            {profile.admin_notes && (
              <span>
                {t("common.reason_label")} {profile.admin_notes}
              </span>
            )}
          </div>
        )}
        <div className="mb-6">
          <StatusHistory
            entityType="provider_status"
            entityId={profile.user_id}
            statusLabel={{
              pending: t("provider.dashboard.status_pending"),
              approved: t("provider.dashboard.status_approved"),
              rejected: t("provider.dashboard.status_rejected"),
            }}
          />
        </div>

        <ProviderSubscriptionCard
          subscriptionStatus={profile.stripe_subscription_status}
          subscriptionPeriodEnd={profile.stripe_subscription_period_end}
          onSuccess={load}
        />

        <ProfilePreview profile={profile} onSaved={load} />

        {quotes.length > 0 && (
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("provider.dashboard.kpi_total")}
              </p>
              <p className="font-display text-2xl font-bold">{quotes.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("provider.dashboard.kpi_pending")}
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                {quotes.filter((q) => q.status === "pending").length}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("provider.dashboard.kpi_quoted")}
              </p>
              <p className="font-display text-2xl font-bold text-primary">
                {quotes.filter((q) => q.status === "quoted").length}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("provider.dashboard.kpi_accepted")}
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {quotes.filter((q) => q.status === "accepted").length}
              </p>
            </div>
          </div>
        )}

        <h2 className="font-display text-xl font-bold mb-3">
          {t("provider.dashboard.requests_count", { count: quotes.length })}
        </h2>
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            {t("provider.dashboard.no_requests")}
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <QuoteCard
                key={q.id}
                q={q}
                profile={profile}
                vehicle={q.vehicle_id ? vehicleMap[q.vehicle_id] : undefined}
                onQuoteAction={load}
                onOpenImpossible={openImpossibleModal}
              />
            ))}
          </div>
        )}
      </main>

      <FAQChatbot
        audience="provider"
        suggestions={[
          t("provider.dashboard.faq_q1"),
          t("provider.dashboard.faq_q2"),
          t("provider.dashboard.faq_q3"),
          t("provider.dashboard.faq_q4"),
        ]}
      />

      {impossibleModal.open && (
        <ImpossibleModal
          onSubmit={submitImpossible}
          onCancel={() => setImpossibleModal({ open: false, quoteId: null })}
        />
      )}
    </div>
  );
}

function ProfilePreview({ profile, onSaved }: { profile: Profile; onSaved?: () => void }) {
  const { t } = useTranslation();
  const arr = (a: string[] | null) => (a && a.length > 0 ? a : null);
  const [editingAreas, setEditingAreas] = useState(false);
  const [areaList, setAreaList] = useState<string[]>(profile.coverage_areas ?? []);
  const [savingAreas, setSavingAreas] = useState(false);
  const [poseTypes, setPoseTypes] = useState<string[]>(profile.pose_location_types ?? []);
  const [savingPoseTypes, setSavingPoseTypes] = useState(false);
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4 mb-4">
        {profile.logo_url ? (
          <img
            src={profile.logo_url}
            alt={profile.company}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center text-xl">
            {profile.company.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold truncate">{profile.company}</h2>
          <div className="text-sm text-muted-foreground">
            {t("common.contact_label")} {profile.full_name}
          </div>
          {profile.siret && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("common.siret_label")} {profile.siret}
            </div>
          )}
        </div>
        <Link
          to="/provider/inscription"
          className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary shrink-0"
        >
          {t("common.edit")}
        </Link>
      </div>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {profile.email && <Row label={t("auth.email")} value={profile.email} />}
        {profile.phone && <Row label={t("common.phone")} value={profile.phone} />}
        {profile.website && <Row label={t("common.website")} value={profile.website} />}
        {profile.pricing_info && <Row label={t("common.pricing")} value={profile.pricing_info} />}
      </dl>
      {profile.description && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {t("common.description")}
          </div>
          <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
        </div>
      )}
      {arr(profile.services) && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {t("provider.dashboard.profile_roles")}
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.services!.map((s) => (
              <span
                key={s}
                className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full"
              >
                {providerServiceLabel(s)}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("provider.dashboard.profile_areas")}
          </div>
          {!editingAreas && (
            <button
              type="button"
              onClick={() => {
                setAreaList(profile.coverage_areas ?? []);
                setEditingAreas(true);
              }}
              className="text-xs text-primary hover:underline"
            >
              {t("common.edit")}
            </button>
          )}
        </div>
        {editingAreas ? (
          <div className="space-y-2">
            <ZoneTagInput
              value={areaList}
              onChange={setAreaList}
              placeholder={t("provider.inscription.coverage_hint")}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingAreas}
                onClick={async () => {
                  setSavingAreas(true);
                  await supabase
                    .from("provider_profiles")
                    .update({ coverage_areas: areaList })
                    .eq("user_id", profile.user_id);
                  setSavingAreas(false);
                  setEditingAreas(false);
                  onSaved?.();
                }}
                className="text-xs rounded-full bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {savingAreas ? t("common.sending") : t("common.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingAreas(false)}
                className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary transition"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {areaList.length > 0 ? (
              areaList.map((z) => (
                <span key={z} className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                  {z}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("provider.inscription.coverage_hint")}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("provider.dashboard.profile_pose_types")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["garage", "domicile"] as const).map((type) => {
            const checked = poseTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                disabled={savingPoseTypes}
                onClick={async () => {
                  const next = checked ? poseTypes.filter((x) => x !== type) : [...poseTypes, type];
                  setPoseTypes(next);
                  setSavingPoseTypes(true);
                  await supabase
                    .from("provider_profiles")
                    .update({ pose_location_types: next })
                    .eq("user_id", profile.user_id);
                  setSavingPoseTypes(false);
                  onSaved?.();
                }}
                className={`flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 transition ${
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                } disabled:opacity-60`}
              >
                {type === "garage" ? "🏪" : "🏠"} {t(`prestataire.dashboard.pose_type_${type}`)}
                {checked && <span className="text-primary">✓</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("provider.dashboard.profile_pose_types_hint")}
        </p>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0">{label} :</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function QuoteCard({
  q,
  profile,
  vehicle,
  onQuoteAction,
  onOpenImpossible,
}: {
  q: Quote;
  profile: Profile;
  vehicle?: VehicleId;
  onQuoteAction: () => void;
  onOpenImpossible: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">
            {t("provider.dashboard.quote_request")}
            {q.id.slice(0, 8)}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(q.created_at).toLocaleString(i18n.language)}
          </div>
        </div>
        <QuoteBadge status={q.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-3">
        {q.vehicle_type && (
          <div>
            <strong className="text-foreground">{t("provider.dashboard.quote_type")}</strong>{" "}
            {q.vehicle_type}
          </div>
        )}
        {q.format && (
          <div>
            <strong className="text-foreground">{t("provider.dashboard.quote_format")}</strong>{" "}
            {q.format}
          </div>
        )}
        {q.quantity && (
          <div>
            <strong className="text-foreground">{t("provider.dashboard.quote_qty")}</strong>{" "}
            {q.quantity}
          </div>
        )}
        {q.deadline && (
          <div>
            <strong className="text-foreground">{t("provider.dashboard.quote_deadline")}</strong>{" "}
            {new Date(q.deadline).toLocaleDateString(i18n.language)}
          </div>
        )}
        {q.zone && (
          <div className="col-span-2">
            <strong className="text-foreground">{t("provider.dashboard.quote_zone")}</strong>{" "}
            {q.zone}
          </div>
        )}
      </div>
      {vehicle && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
            {t("provider.dashboard.vehicle_id_title")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            {vehicle.license_plate && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground block">
                  {t("provider.dashboard.vehicle_plate")}
                </span>
                <span className="font-mono font-bold tracking-widest">{vehicle.license_plate}</span>
              </div>
            )}
            {vehicle.brand && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t("provider.dashboard.vehicle_brand")}
                </span>
                <span className="font-medium">{vehicle.brand}</span>
              </div>
            )}
            {vehicle.model && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t("provider.dashboard.vehicle_model")}
                </span>
                <span className="font-medium">{vehicle.model}</span>
              </div>
            )}
            {vehicle.color && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  {t("provider.dashboard.vehicle_color")}
                </span>
                <span className="font-medium">{vehicle.color}</span>
              </div>
            )}
          </div>
          {vehicle.name && (
            <div className="mt-1 text-xs text-muted-foreground">
              {t("provider.dashboard.vehicle_nickname")} {vehicle.name}
            </div>
          )}
          {vehicle.photos && vehicle.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {vehicle.photos.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${t("provider.dashboard.vehicle_photo")} ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mb-3">
        <ProviderQuoteReview
          quote={q}
          providerProfile={{
            services: profile.services,
            description: profile.description,
            company: profile.company,
          }}
          onQuoteAction={onQuoteAction}
        />
      </div>
      {q.status === "quoted" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          {t("provider.dashboard.quote_sent")}{" "}
          <strong>{((q.quoted_price_cents ?? 0) / 100).toFixed(2)} €</strong>
          {q.quoted_message && (
            <p className="text-xs mt-1 whitespace-pre-wrap">{q.quoted_message}</p>
          )}
        </div>
      )}
      {(q.status === "quoted" || q.status === "accepted") && <WeatherInstallCheck zone={q.zone} />}
      {q.status === "accepted" && q.zone && <TrafficLinks zone={q.zone} />}
      {(q.status === "quoted" || q.status === "accepted") && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            onClick={() => onOpenImpossible(q.id)}
            className="rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40 px-3 py-2 text-sm font-semibold hover:bg-orange-500/25"
          >
            {t("provider.dashboard.report_impossible")}
          </button>
        </div>
      )}
      {q.status === "impossible_pending" && (
        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">
          {t("provider.dashboard.impossible_pending")}
          {q.impossible_reason && (
            <p className="mt-1 text-xs italic">
              {t("provider.dashboard.impossible_reason")} {q.impossible_reason}
            </p>
          )}
        </div>
      )}
      {q.status === "impossible" && (
        <div className="mt-3 rounded-lg bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-700 dark:text-orange-300">
          {t("provider.dashboard.impossible_confirmed")}
        </div>
      )}
    </div>
  );
}

function TrafficLinks({ zone }: { zone: string }) {
  const { t } = useTranslation();
  const q = encodeURIComponent(zone);
  const wazeUrl = `https://waze.com/ul?q=${q}&navigate=yes`;
  const mapsUrl = `https://maps.google.com/maps?q=${q}`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{t("provider.dashboard.traffic_link")}</span>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors"
      >
        Waze
      </a>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors"
      >
        Google Maps
      </a>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const m: Record<string, { l: string; c: string }> = {
    pending: {
      l: t("provider.dashboard.status_pending"),
      c: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    approved: { l: t("provider.dashboard.status_approved"), c: "bg-signal/20 text-signal" },
    rejected: {
      l: t("provider.dashboard.status_rejected"),
      c: "bg-destructive/15 text-destructive",
    },
    suspended: { l: t("provider.dashboard.status_suspended"), c: "bg-secondary" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function QuoteBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const m: Record<string, { l: string; c: string }> = {
    pending: {
      l: t("provider.dashboard.qs_new"),
      c: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    quoted: { l: t("provider.dashboard.qs_quoted"), c: "bg-primary/15 text-primary" },
    accepted: { l: t("provider.dashboard.qs_accepted"), c: "bg-signal/20 text-signal" },
    rejected: { l: t("provider.dashboard.qs_rejected"), c: "bg-destructive/15 text-destructive" },
    cancelled: { l: t("provider.dashboard.qs_cancelled"), c: "bg-secondary text-muted-foreground" },
    impossible_pending: {
      l: t("provider.dashboard.qs_impossible_pending"),
      c: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    impossible: {
      l: t("provider.dashboard.qs_impossible"),
      c: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function ZoneTagInput({
  value,
  onChange,
  placeholder,
  max = 30,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [input, setInput] = useState("");

  const addZones = (raw: string) => {
    const zones = raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange([...value, ...zones.filter((z) => !value.includes(z))].slice(0, max));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addZones(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="w-full rounded-lg border border-border bg-background px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px] cursor-text">
      {value.map((z) => (
        <span
          key={z}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-xs font-medium px-2.5 py-0.5"
        >
          {z}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== z))}
            className="hover:text-destructive transition leading-none"
            aria-label={`Supprimer ${z}`}
          >
            ×
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) addZones(input);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}

function ImpossibleModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string, files: File[]) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 3);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(t("provider.dashboard.error_reason_required"));
      return;
    }
    setUploading(true);
    await onSubmit(reason.trim(), files);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
        <h2 className="font-display text-lg font-bold mb-1">
          {t("provider.dashboard.modal_title")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{t("provider.dashboard.modal_body")}</p>

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {t("provider.dashboard.modal_reason_label")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ex : surface du véhicule trop endommagée, présence de rouille empêchant l'adhésion du vinyle…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-4"
        />

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {t("provider.dashboard.modal_photos_label")}
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="text-sm text-muted-foreground mb-3"
        />
        {previews.length > 0 && (
          <div className="flex gap-2 mb-4">
            {previews.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Pièce jointe ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !reason.trim()}
            className="rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {uploading ? t("common.sending") : t("provider.dashboard.modal_submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
