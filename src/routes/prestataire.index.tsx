import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { ProviderSubscriptionCard } from "@/components/provider/ProviderSubscriptionCard";
import { RouteError } from "@/components/app/RouteError";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/prestataire/")({
  head: () => ({
    meta: [
      { title: "Espace prestataire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Profile = {
  user_id: string; company: string; full_name: string; status: string; admin_notes: string | null;
  siret: string | null; email: string | null; phone: string | null; website: string | null;
  description: string | null; services: string[] | null; coverage_areas: string[] | null;
  pricing_info: string | null; logo_url: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_period_end: string | null;
};

type Quote = {
  id: string; advertiser_id: string; service_type: string; vehicle_type: string | null;
  vehicle_id: string | null;
  format: string | null; quantity: number | null; deadline: string | null; zone: string | null;
  message: string; status: string; quoted_price_cents: number | null; quoted_message: string | null;
  impossible_reason: string | null; impossible_photos: string[]; impossible_at: string | null;
  created_at: string;
};

type VehicleId = {
  license_plate: string | null; brand: string | null; model: string | null; color: string | null;
  name: string; type: string; photos: string[] | null;
};

function ProviderDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, VehicleId>>({});
  const [impossibleModal, setImpossibleModal] = useState<{ open: boolean; quoteId: string | null }>({ open: false, quoteId: null });

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/prestataire/connexion" }); return; }
    const { data: p } = await supabase.from("provider_profiles")
      .select("user_id, company, full_name, status, admin_notes, siret, email, phone, website, description, services, coverage_areas, pricing_info, logo_url, stripe_subscription_status, stripe_subscription_period_end")
      .eq("user_id", sess.session.user.id).maybeSingle();
    if (!p) { navigate({ to: "/prestataire/inscription" }); return; }
    setProfile(p as Profile);
    const { data: qs } = await supabase.from("service_quotes")
      .select("*").eq("provider_id", sess.session.user.id)
      .order("created_at", { ascending: false });
    const quoteList = (qs as Quote[]) ?? [];
    setQuotes(quoteList);

    // Fetch identification data for quoted vehicles
    const vehicleIds = [...new Set(quoteList.map((q) => q.vehicle_id).filter((id): id is string => !!id))];
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase.from("vehicles")
        .select("id, license_plate, brand, model, color, name, type, photos")
        .in("id", vehicleIds);
      const map: Record<string, VehicleId> = {};
      for (const v of vehicles ?? []) map[v.id] = v as VehicleId;
      setVehicleMap(map);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const respondQuote = async (id: string, priceEur: string, msg: string) => {
    const cents = Math.round(Number(priceEur) * 100);
    if (!cents || cents < 0) { alert(t("prestataire.dashboard.error_invalid_price")); return; }
    await supabase.from("service_quotes").update({
      status: "quoted", quoted_price_cents: cents, quoted_message: msg || null, quoted_at: new Date().toISOString(),
    }).eq("id", id);
    await load();
  };

  const rejectQuote = async (id: string) => {
    if (!confirm(t("prestataire.dashboard.error_confirm_reject"))) return;
    await supabase.from("service_quotes").update({ status: "rejected" }).eq("id", id);
    await load();
  };

  const openImpossibleModal = (id: string) =>
    setImpossibleModal({ open: true, quoteId: id });

  const submitImpossible = async (reason: string, files: File[]) => {
    const { quoteId } = impossibleModal;
    if (!quoteId) return;
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;

    const photoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${uid}/${quoteId}/photo-${i + 1}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("pose-impossible").upload(path, file, { upsert: true });
      if (!error) {
        const { data: signed } = await supabase.storage.from("pose-impossible").createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed) photoUrls.push(signed.signedUrl);
      }
    }

    await supabase.from("service_quotes").update({
      status: "impossible_pending",
      impossible_reason: reason,
      impossible_photos: photoUrls,
      impossible_at: new Date().toISOString(),
    }).eq("id", quoteId);

    setImpossibleModal({ open: false, quoteId: null });
    await load();
  };

  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile.company}</span>
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram MoveSpot"
              className="rounded-full p-2 hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <Link to="/parametres" className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary">{t("common.settings")}</Link>
            <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary">{t("common.logout")}</button>
          </div>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("prestataire.dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("prestataire.dashboard.subtitle")}</p>
          </div>
          <StatusBadge status={profile.status} />
        </div>

        {profile.status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            {t("prestataire.dashboard.pending_notice")}
          </div>
        )}
        {profile.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {t("prestataire.dashboard.rejected_notice")} {profile.admin_notes && <span>{t("common.reason_label")} {profile.admin_notes}</span>}
          </div>
        )}
        <div className="mb-6">
          <StatusHistory
            entityType="provider_status"
            entityId={profile.user_id}
            statusLabel={{ pending: t("prestataire.dashboard.status_pending"), approved: t("prestataire.dashboard.status_approved"), rejected: t("prestataire.dashboard.status_rejected") }}
          />
        </div>

        <ProviderSubscriptionCard
          subscriptionStatus={profile.stripe_subscription_status}
          subscriptionPeriodEnd={profile.stripe_subscription_period_end}
          onSuccess={load}
        />

        <ProfilePreview profile={profile} />


        <h2 className="font-display text-xl font-bold mb-3">{t("prestataire.dashboard.requests_count", { count: quotes.length })}</h2>
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            {t("prestataire.dashboard.no_requests")}
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => <QuoteCard key={q.id} q={q} vehicle={q.vehicle_id ? vehicleMap[q.vehicle_id] : undefined} onRespond={respondQuote} onReject={rejectQuote} onOpenImpossible={openImpossibleModal} />)}
          </div>
        )}
      </main>

      <FAQChatbot
        audience="prestataire"
        suggestions={[
          t("prestataire.dashboard.faq_q1"),
          t("prestataire.dashboard.faq_q2"),
          t("prestataire.dashboard.faq_q3"),
          t("prestataire.dashboard.faq_q4"),
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

function ProfilePreview({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const arr = (a: string[] | null) => (a && a.length > 0 ? a : null);
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4 mb-4">
        {profile.logo_url ? (
          <img src={profile.logo_url} alt={profile.company} className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center text-xl">
            {profile.company.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold truncate">{profile.company}</h2>
          <div className="text-sm text-muted-foreground">{t("common.contact_label")} {profile.full_name}</div>
          {profile.siret && <div className="text-xs text-muted-foreground mt-0.5">{t("common.siret_label")} {profile.siret}</div>}
        </div>
        <Link to="/prestataire/inscription" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary shrink-0">
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
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{t("common.description")}</div>
          <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
        </div>
      )}
      {arr(profile.services) && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{t("prestataire.dashboard.profile_roles")}</div>
          <div className="flex flex-wrap gap-1">
            {profile.services!.map((s) => <span key={s} className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{providerServiceLabel(s)}</span>)}
          </div>
        </div>
      )}
      {arr(profile.coverage_areas) && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{t("prestataire.dashboard.profile_areas")}</div>
          <div className="flex flex-wrap gap-1">
            {profile.coverage_areas!.map((z) => <span key={z} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{z}</span>)}
          </div>
        </div>
      )}
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

function QuoteCard({ q, vehicle, onRespond, onReject, onOpenImpossible }: { q: Quote; vehicle?: VehicleId; onRespond: (id: string, price: string, msg: string) => void; onReject: (id: string) => void; onOpenImpossible: (id: string) => void }) {
  const { t } = useTranslation();
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">{t("prestataire.dashboard.quote_request")}{q.id.slice(0, 8)}</div>
          <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("fr-FR")}</div>
        </div>
        <QuoteBadge status={q.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-3">
        {q.vehicle_type && <div><strong className="text-foreground">{t("prestataire.dashboard.quote_type")}</strong> {q.vehicle_type}</div>}
        {q.format && <div><strong className="text-foreground">{t("prestataire.dashboard.quote_format")}</strong> {q.format}</div>}
        {q.quantity && <div><strong className="text-foreground">{t("prestataire.dashboard.quote_qty")}</strong> {q.quantity}</div>}
        {q.deadline && <div><strong className="text-foreground">{t("prestataire.dashboard.quote_deadline")}</strong> {new Date(q.deadline).toLocaleDateString("fr-FR")}</div>}
        {q.zone && <div className="col-span-2"><strong className="text-foreground">{t("prestataire.dashboard.quote_zone")}</strong> {q.zone}</div>}
      </div>
      {vehicle && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{t("prestataire.dashboard.vehicle_id_title")}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            {vehicle.license_plate && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground block">{t("prestataire.dashboard.vehicle_plate")}</span>
                <span className="font-mono font-bold tracking-widest">{vehicle.license_plate}</span>
              </div>
            )}
            {vehicle.brand && (
              <div>
                <span className="text-xs text-muted-foreground block">{t("prestataire.dashboard.vehicle_brand")}</span>
                <span className="font-medium">{vehicle.brand}</span>
              </div>
            )}
            {vehicle.model && (
              <div>
                <span className="text-xs text-muted-foreground block">{t("prestataire.dashboard.vehicle_model")}</span>
                <span className="font-medium">{vehicle.model}</span>
              </div>
            )}
            {vehicle.color && (
              <div>
                <span className="text-xs text-muted-foreground block">{t("prestataire.dashboard.vehicle_color")}</span>
                <span className="font-medium">{vehicle.color}</span>
              </div>
            )}
          </div>
          {vehicle.name && (
            <div className="mt-1 text-xs text-muted-foreground">{t("prestataire.dashboard.vehicle_nickname")} {vehicle.name}</div>
          )}
          {vehicle.photos && vehicle.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {vehicle.photos.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt={`${t("prestataire.dashboard.vehicle_photo")} ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-border" />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-sm whitespace-pre-wrap mb-3">{q.message}</p>
      {q.status === "quoted" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          {t("prestataire.dashboard.quote_sent")} <strong>{((q.quoted_price_cents ?? 0) / 100).toFixed(2)} €</strong>
          {q.quoted_message && <p className="text-xs mt-1 whitespace-pre-wrap">{q.quoted_message}</p>}
        </div>
      )}
      {(q.status === "quoted" || q.status === "accepted") && (
        <WeatherInstallCheck zone={q.zone} />
      )}
      {q.status === "accepted" && q.zone && (
        <TrafficLinks zone={q.zone} />
      )}
      {(q.status === "quoted" || q.status === "accepted") && (
        <div className="mt-3 border-t border-border pt-3">
          <button onClick={() => onOpenImpossible(q.id)}
            className="rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/40 px-3 py-2 text-sm font-semibold hover:bg-orange-500/25">
            {t("prestataire.dashboard.report_impossible")}
          </button>
        </div>
      )}
      {q.status === "impossible_pending" && (
        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">
          {t("prestataire.dashboard.impossible_pending")}
          {q.impossible_reason && <p className="mt-1 text-xs italic">{t("prestataire.dashboard.impossible_reason")} {q.impossible_reason}</p>}
        </div>
      )}
      {q.status === "impossible" && (
        <div className="mt-3 rounded-lg bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-700 dark:text-orange-300">
          {t("prestataire.dashboard.impossible_confirmed")}
        </div>
      )}
      {q.status === "pending" && (
        <div className="space-y-2 mt-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder={t("prestataire.dashboard.price_label")} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => onRespond(q.id, price, msg)}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90">
              {t("prestataire.dashboard.send_quote_btn")}
            </button>
            <button onClick={() => onReject(q.id)}
              className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-2 text-sm font-semibold hover:bg-destructive/25">
              {t("prestataire.dashboard.reject_btn")}
            </button>
          </div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={1000}
            placeholder={t("prestataire.dashboard.message_label")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
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
      <span className="text-xs text-muted-foreground">{t("prestataire.dashboard.traffic_link")}</span>
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors">
        Waze
      </a>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/80 transition-colors">
        Google Maps
      </a>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const m: Record<string, { l: string; c: string }> = {
    pending: { l: t("prestataire.dashboard.status_pending"), c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    approved: { l: t("prestataire.dashboard.status_approved"), c: "bg-signal/20 text-signal" },
    rejected: { l: t("prestataire.dashboard.status_rejected"), c: "bg-destructive/15 text-destructive" },
    suspended: { l: t("prestataire.dashboard.status_suspended"), c: "bg-secondary" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function QuoteBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const m: Record<string, { l: string; c: string }> = {
    pending: { l: t("prestataire.dashboard.qs_new"), c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    quoted: { l: t("prestataire.dashboard.qs_quoted"), c: "bg-primary/15 text-primary" },
    accepted: { l: t("prestataire.dashboard.qs_accepted"), c: "bg-signal/20 text-signal" },
    rejected: { l: t("prestataire.dashboard.qs_rejected"), c: "bg-destructive/15 text-destructive" },
    cancelled: { l: t("prestataire.dashboard.qs_cancelled"), c: "bg-secondary text-muted-foreground" },
    impossible_pending: { l: t("prestataire.dashboard.qs_impossible_pending"), c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    impossible: { l: t("prestataire.dashboard.qs_impossible"), c: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function ImpossibleModal({ onSubmit, onCancel }: {
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
    if (!reason.trim()) { alert(t("prestataire.dashboard.error_reason_required")); return; }
    setUploading(true);
    await onSubmit(reason.trim(), files);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
        <h2 className="font-display text-lg font-bold mb-1">{t("prestataire.dashboard.modal_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("prestataire.dashboard.modal_body")}
        </p>

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {t("prestataire.dashboard.modal_reason_label")}
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
          {t("prestataire.dashboard.modal_photos_label")}
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
              <img key={i} src={src} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={uploading}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
            {t("common.cancel")}
          </button>
          <button onClick={handleSubmit} disabled={uploading || !reason.trim()}
            className="rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            {uploading ? t("common.sending") : t("prestataire.dashboard.modal_submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
