import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { PartnerSubscriptionCard } from "@/components/partner/PartnerSubscriptionCard";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/partenaire/")({
  head: () => ({
    meta: [
      { title: "Espace partenaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type PartnerProfile = {
  user_id: string;
  company: string;
  full_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  status: string;
  admin_notes: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_period_end: string | null;
};

function PartnerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/partenaire/inscription" }); return; }
    const { data: p } = await supabase
      .from("partner_profiles")
      .select("user_id, company, full_name, email, phone, website, description, status, admin_notes, stripe_subscription_status, stripe_subscription_period_end")
      .eq("user_id", sess.session.user.id)
      .maybeSingle();
    if (!p) { navigate({ to: "/partenaire/inscription" }); return; }
    setProfile(p as unknown as PartnerProfile);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile.company}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Espace partenaire</h1>
            <p className="text-sm text-muted-foreground mt-1">Bienvenue, {profile.full_name}.</p>
          </div>
          <StatusBadge status={profile.status} />
        </div>

        {profile.status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            ⏳ Votre candidature est en cours d'examen par MoveSpot. Vous recevrez une réponse par email.
          </div>
        )}
        {profile.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            ⛔ Candidature refusée.{profile.admin_notes && <span> Motif : {profile.admin_notes}</span>}
          </div>
        )}

        <PartnerSubscriptionCard
          subscriptionStatus={profile.stripe_subscription_status}
          subscriptionPeriodEnd={profile.stripe_subscription_period_end}
          onSuccess={load}
        />

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold mb-4">Votre profil partenaire</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Entreprise" value={profile.company} />
            <Row label="Responsable" value={profile.full_name} />
            <Row label="Email" value={profile.email} />
            {profile.phone && <Row label="Téléphone" value={profile.phone} />}
            {profile.website && <Row label="Site web" value={profile.website} />}
          </dl>
          {profile.description && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
            </div>
          )}
          <div className="mt-4">
            <Link to="/partenaire/inscription" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary">
              Modifier mon profil
            </Link>
          </div>
        </section>
      </main>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { l: string; c: string }> = {
    pending:  { l: "En attente",  c: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    approved: { l: "Approuvé",    c: "bg-signal/20 text-signal" },
    rejected: { l: "Refusé",      c: "bg-destructive/15 text-destructive" },
    suspended:{ l: "Suspendu",    c: "bg-secondary" },
  };
  const x = m[status] ?? m.pending;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${x.c}`}>{x.l}</span>;
}
