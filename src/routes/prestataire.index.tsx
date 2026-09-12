import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { ProviderSubscriptionCard } from "@/components/provider/ProviderSubscriptionCard";
import { RouteError } from "@/components/app/RouteError";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";

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
    if (!cents || cents < 0) { alert("Prix invalide"); return; }
    await supabase.from("service_quotes").update({
      status: "quoted", quoted_price_cents: cents, quoted_message: msg || null, quoted_at: new Date().toISOString(),
    }).eq("id", id);
    await load();
  };

  const rejectQuote = async (id: string) => {
    if (!confirm("Refuser cette demande ?")) return;
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

  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile.company}</span>
            <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary">Se déconnecter</button>
          </div>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Espace prestataire</h1>
            <p className="text-sm text-muted-foreground mt-1">Vos demandes de devis entrantes.</p>
          </div>
          <StatusBadge status={profile.status} />
        </div>

        {profile.status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            ⏳ Votre fiche est en cours de validation par MoveSpot. Vous recevrez les demandes dès qu'elle sera approuvée.
          </div>
        )}
        {profile.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            ⛔ Fiche refusée. {profile.admin_notes && <span>Motif : {profile.admin_notes}</span>}
          </div>
        )}
        <div className="mb-6">
          <StatusHistory
            entityType="provider_status"
            entityId={profile.user_id}
            statusLabel={{ pending: "En attente", approved: "Approuvée", rejected: "Refusée" }}
          />
        </div>

        <ProviderSubscriptionCard
          subscriptionStatus={profile.stripe_subscription_status}
          subscriptionPeriodEnd={profile.stripe_subscription_period_end}
          onSuccess={load}
        />

        <ProfilePreview profile={profile} />


        <h2 className="font-display text-xl font-bold mb-3">Demandes ({quotes.length})</h2>
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Aucune demande pour l'instant.
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
          "Combien de temps prend la validation de mon profil ?",
          "Comment mettre à jour mon portfolio ?",
          "Pourquoi ma fiche n'apparaît pas dans l'annuaire ?",
          "Comment répondre à une demande de devis ?",
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
          <div className="text-sm text-muted-foreground">Contact : {profile.full_name}</div>
          {profile.siret && <div className="text-xs text-muted-foreground mt-0.5">SIRET : {profile.siret}</div>}
        </div>
        <Link to="/prestataire/inscription" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary shrink-0">
          Modifier
        </Link>
      </div>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {profile.email && <Row label="Email" value={profile.email} />}
        {profile.phone && <Row label="Téléphone" value={profile.phone} />}
        {profile.website && <Row label="Site web" value={profile.website} />}
        {profile.pricing_info && <Row label="Tarifs" value={profile.pricing_info} />}
      </dl>
      {profile.description && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
          <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
        </div>
      )}
      {arr(profile.services) && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Rôles / prestations</div>
          <div className="flex flex-wrap gap-1">
            {profile.services!.map((s) => <span key={s} className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{providerServiceLabel(s)}</span>)}
          </div>
        </div>
      )}
      {arr(profile.coverage_areas) && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Zones couvertes</div>
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
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">Demande #{q.id.slice(0, 8)}</div>
          <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("fr-FR")}</div>
        </div>
        <QuoteBadge status={q.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground mb-3">
        {q.vehicle_type && <div><strong className="text-foreground">Type :</strong> {q.vehicle_type}</div>}
        {q.format && <div><strong className="text-foreground">Format :</strong> {q.format}</div>}
        {q.quantity && <div><strong className="text-foreground">Qté :</strong> {q.quantity}</div>}
        {q.deadline && <div><strong className="text-foreground">Échéance :</strong> {new Date(q.deadline).toLocaleDateString("fr-FR")}</div>}
        {q.zone && <div className="col-span-2"><strong className="text-foreground">Zone :</strong> {q.zone}</div>}
      </div>
      {vehicle && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">🚗 Identification du véhicule à habiller</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            {vehicle.license_plate && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground block">Plaque</span>
                <span className="font-mono font-bold tracking-widest">{vehicle.license_plate}</span>
              </div>
            )}
            {vehicle.brand && (
              <div>
                <span className="text-xs text-muted-foreground block">Marque</span>
                <span className="font-medium">{vehicle.brand}</span>
              </div>
            )}
            {vehicle.model && (
              <div>
                <span className="text-xs text-muted-foreground block">Modèle</span>
                <span className="font-medium">{vehicle.model}</span>
              </div>
            )}
            {vehicle.color && (
              <div>
                <span className="text-xs text-muted-foreground block">Couleur</span>
                <span className="font-medium">{vehicle.color}</span>
              </div>
            )}
          </div>
          {vehicle.name && (
            <div className="mt-1 text-xs text-muted-foreground">Surnom : {vehicle.name}</div>
          )}
          {vehicle.photos && vehicle.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {vehicle.photos.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt={`Photo véhicule ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-border" />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-sm whitespace-pre-wrap mb-3">{q.message}</p>
      {q.status === "quoted" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          ✓ Devis envoyé : <strong>{((q.quoted_price_cents ?? 0) / 100).toFixed(2)} €</strong>
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
            ⚠ Signaler une pose impossible
          </button>
        </div>
      )}
      {q.status === "impossible_pending" && (
        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">
          ⏳ Signalement en cours de vérification par MoveSpot.
          {q.impossible_reason && <p className="mt-1 text-xs italic">Motif : {q.impossible_reason}</p>}
        </div>
      )}
      {q.status === "impossible" && (
        <div className="mt-3 rounded-lg bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-700 dark:text-orange-300">
          ⚠ Pose impossible confirmée — remboursement de l'annonceur en cours.
        </div>
      )}
      {q.status === "pending" && (
        <div className="space-y-2 mt-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Prix proposé (€)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => onRespond(q.id, price, msg)}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90">
              Envoyer le devis
            </button>
            <button onClick={() => onReject(q.id)}
              className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-2 text-sm font-semibold hover:bg-destructive/25">
              Refuser
            </button>
          </div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={1000}
            placeholder="Message au client (délais, conditions…)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

function TrafficLinks({ zone }: { zone: string }) {
  const q = encodeURIComponent(zone);
  const wazeUrl = `https://waze.com/ul?q=${q}&navigate=yes`;
  const mapsUrl = `https://maps.google.com/maps?q=${q}`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">🗺️ Vérifier le trafic :</span>
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
  const m: Record<string, { l: string; c: string }> = {
    pending: { l: "Fiche en attente", c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    approved: { l: "Approuvée", c: "bg-signal/20 text-signal" },
    rejected: { l: "Refusée", c: "bg-destructive/15 text-destructive" },
    suspended: { l: "Suspendue", c: "bg-secondary" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function QuoteBadge({ status }: { status: string }) {
  const m: Record<string, { l: string; c: string }> = {
    pending: { l: "Nouveau", c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    quoted: { l: "Devis envoyé", c: "bg-primary/15 text-primary" },
    accepted: { l: "Accepté", c: "bg-signal/20 text-signal" },
    rejected: { l: "Refusé", c: "bg-destructive/15 text-destructive" },
    cancelled: { l: "Annulé", c: "bg-secondary text-muted-foreground" },
    impossible_pending: { l: "Vérification en cours", c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    impossible: { l: "Pose impossible", c: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}

function ImpossibleModal({ onSubmit, onCancel }: {
  onSubmit: (reason: string, files: File[]) => Promise<void>;
  onCancel: () => void;
}) {
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
    if (!reason.trim()) { alert("Veuillez décrire le motif de l'impossibilité."); return; }
    setUploading(true);
    await onSubmit(reason.trim(), files);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
        <h2 className="font-display text-lg font-bold mb-1">Signaler une pose impossible</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Décrivez pourquoi la pose n'a pas pu être réalisée. MoveSpot vérifiera votre signalement avant de rembourser l'annonceur.
        </p>

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Motif (obligatoire)
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
          Photos justificatives (max 3, recommandé)
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
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={uploading || !reason.trim()}
            className="rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            {uploading ? "Envoi…" : "Envoyer le signalement"}
          </button>
        </div>
      </div>
    </div>
  );
}
