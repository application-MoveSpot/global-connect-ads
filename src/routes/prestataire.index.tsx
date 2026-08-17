import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { ProviderSubscriptionCard } from "@/components/provider/ProviderSubscriptionCard";

export const Route = createFileRoute("/prestataire/")({
  head: () => ({
    meta: [
      { title: "Espace prestataire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProviderDashboard,
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
  format: string | null; quantity: number | null; deadline: string | null; zone: string | null;
  message: string; status: string; quoted_price_cents: number | null; quoted_message: string | null;
  created_at: string;
};

function ProviderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

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
    setQuotes((qs as Quote[]) ?? []);
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
      <main className="max-w-5xl mx-auto px-4 py-8">
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
            {quotes.map((q) => <QuoteCard key={q.id} q={q} onRespond={respondQuote} onReject={rejectQuote} />)}
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

function QuoteCard({ q, onRespond, onReject }: { q: Quote; onRespond: (id: string, price: string, msg: string) => void; onReject: (id: string) => void }) {
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
        {q.vehicle_type && <div><strong className="text-foreground">Véhicule :</strong> {q.vehicle_type}</div>}
        {q.format && <div><strong className="text-foreground">Format :</strong> {q.format}</div>}
        {q.quantity && <div><strong className="text-foreground">Qté :</strong> {q.quantity}</div>}
        {q.deadline && <div><strong className="text-foreground">Échéance :</strong> {new Date(q.deadline).toLocaleDateString("fr-FR")}</div>}
        {q.zone && <div className="col-span-2"><strong className="text-foreground">Zone :</strong> {q.zone}</div>}
      </div>
      <p className="text-sm whitespace-pre-wrap mb-3">{q.message}</p>
      {q.status === "quoted" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          ✓ Devis envoyé : <strong>{((q.quoted_price_cents ?? 0) / 100).toFixed(2)} €</strong>
          {q.quoted_message && <p className="text-xs mt-1 whitespace-pre-wrap">{q.quoted_message}</p>}
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
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}
