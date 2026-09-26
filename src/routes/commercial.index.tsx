import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCommercialDashboard, type CommercialProfile, type CommercialClient, type CommercialCampaign } from "@/lib/commercial/commercial.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { NetworkErrorBanner } from "@/components/app/NetworkErrorBanner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, TrendingUp, Users, ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/commercial/")({
  head: () => ({
    meta: [
      { title: "Espace commercial — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CommercialDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente", color: "text-amber-600 bg-amber-500/10" },
  approved:  { label: "Approuvée",  color: "text-emerald-600 bg-emerald-500/10" },
  paid:      { label: "Payée",      color: "text-emerald-600 bg-emerald-500/10" },
  completed: { label: "Terminée",   color: "text-blue-600 bg-blue-500/10" },
  rejected:  { label: "Refusée",    color: "text-red-600 bg-red-500/10" },
};

function CommercialDashboard() {
  const navigate = useNavigate();
  const dashFn = useServerFn(getCommercialDashboard);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommercialProfile | null>(null);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [campaigns, setCampaigns] = useState<CommercialCampaign[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [paidCents, setPaidCents] = useState(0);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/commercial/inscription" }); return; }
    try {
      const res = await dashFn({ data: {} });
      if (!res.ok) {
        if (res.error?.includes("introuvable")) {
          navigate({ to: "/commercial/inscription" });
          return;
        }
        setError(res.error ?? "Erreur");
      } else {
        setError(null);
        setProfile(res.profile);
        setClients(res.clients);
        setCampaigns(res.campaigns);
        setTotalCents(res.totalCommissionCents);
        setPaidCents(res.paidCommissionCents);
      }
    } catch {
      setError("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [dashFn, navigate]);

  useEffect(() => { void load(); }, [load]);

  const referralLink = profile
    ? `${typeof window !== "undefined" ? window.location.origin : "https://movespot.fr"}/annonceur/inscription?ref=${profile.referral_code}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied
    }
  };

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Espace commercial</h1>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <NetworkErrorBanner
            message={error}
            onRetry={() => load(true)}
            retrying={retrying}
          />
        )}

        {/* Lien de parrainage */}
        {profile && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Votre lien de parrainage</p>
                <p className="text-xs text-muted-foreground mt-0.5">Partagez ce lien — chaque annonceur inscrit via ce lien vous est automatiquement attribué.</p>
              </div>
              <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">{profile.referral_code}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-xs bg-background border border-border rounded-lg px-3 py-2 truncate">{referralLink}</code>
              <button onClick={copyLink}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary transition">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Commission : <strong className="text-foreground">{Math.round((profile.commission_rate ?? 0.10) * 100)} %</strong> du montant hors taxes de chaque campagne réalisée.
            </p>
          </div>
        )}

        {/* Résumé chiffres */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Clients apportés</p>
            </div>
            <p className="font-display text-3xl font-bold">{clients.length}</p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Commissions générées</p>
            <p className="font-display text-3xl font-bold text-primary">
              {(totalCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Commissions versées</p>
            </div>
            <p className="font-display text-3xl font-bold text-emerald-600">
              {(paidCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>

        {/* Clients */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Mes clients ({clients.length})</h2>
          {clients.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">Aucun client pour l'instant.</p>
              <p className="text-muted-foreground text-xs mt-1">Partagez votre lien de parrainage pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{c.full_name}</p>
                    {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(c.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Campagnes */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Campagnes & commissions ({campaigns.length})</h2>
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">Aucune campagne pour l'instant.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((camp) => {
                const st = STATUS_LABELS[camp.status] ?? { label: camp.status, color: "text-muted-foreground bg-muted" };
                return (
                  <div key={camp.id} className="rounded-xl border border-border bg-card px-5 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">{camp.spot_name}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          {camp.commission_paid_at && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">Commission versée</span>
                          )}
                        </div>
                        <p className="font-medium text-sm mt-0.5">{camp.company}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {camp.commission_amount_cents != null && (
                          <p className="font-display text-lg font-bold text-primary">
                            {(camp.commission_amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                          </p>
                        )}
                        {camp.total_price != null && (
                          <p className="text-xs text-muted-foreground">
                            Campagne : {camp.total_price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Note de versement */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Versement des commissions :</strong> Les commissions sont calculées et versées par virement bancaire à la fin de chaque mois, après validation et paiement des campagnes concernées. Contactez{" "}
          <a href="mailto:contact@movespot.fr" className="underline text-foreground">contact@movespot.fr</a> pour vos coordonnées bancaires.
        </div>
      </main>
    </div>
  );
}
