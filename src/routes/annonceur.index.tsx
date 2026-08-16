import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogoLink } from "@/components/app/LogoLink";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { RouteSummary } from "@/components/shared/RouteSummary";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { CampaignStepper } from "@/components/shared/CampaignStepper";
import { MobilityMap } from "@/components/shared/MobilityMap";
import { supabase } from "@/integrations/supabase/client";
import { payCampaignWithWallet, getMyWallet } from "@/lib/payments/wallet.functions";
import { toast } from "sonner";

type Req = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
  total_price: number | null;
  payment_status: string;
  installation_status: string | null;
  subscription_status: string | null;
};

type Profile = { full_name: string; company: string | null };

export const Route = createFileRoute("/annonceur/")({
  head: () => ({
    meta: [
      { title: "Espace annonceur — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnnonceurDashboard,
});

function AnnonceurDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [paying, setPaying] = useState<string | null>(null);
  const payFn = useServerFn(payCampaignWithWallet);
  const walletFn = useServerFn(getMyWallet);

  const reload = async (userId: string) => {
    const [{ data: reqs }, w] = await Promise.all([
      supabase
        .from("campaign_requests")
        .select("id, spot_name, spot_location, spot_price, message, status, owner_response, admin_notes, created_at, route_zones, route_waypoints, route_pois, estimated_impressions_per_day, days_count, creative_files, total_price, payment_status, installation_status, subscription_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      walletFn(),
    ]);
    setRequests((reqs as Req[]) ?? []);
    setBalanceCents(w?.balance_cents ?? 0);
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/annonceur/inscription" });
        return;
      }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("full_name, company")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) {
        navigate({ to: "/annonceur/inscription" });
        return;
      }
      setProfile(prof);
      await reload(sess.session.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handlePay = async (r: Req) => {
    const cents = Math.round(Number(r.total_price ?? 0) * 100);
    if (cents > balanceCents) {
      toast.error(`Solde insuffisant. Manque ${((cents - balanceCents) / 100).toFixed(2)} €.`);
      navigate({ to: "/annonceur/portefeuille" });
      return;
    }
    setPaying(r.id);
    try {
      await payFn({ data: { campaignRequestId: r.id } });
      toast.success("Paiement effectué ✓");
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) await reload(sess.session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec du paiement");
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}{profile?.company ? ` · ${profile.company}` : ""}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Mes campagnes</h1>
            <p className="text-sm text-muted-foreground mt-1">Suivez le statut de vos réservations.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/annonceur/portefeuille" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition">
              💳 Portefeuille · {(balanceCents / 100).toFixed(2)} €
            </Link>
            <Link to="/prestataires" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition">
              🎨 Prestataires covering
            </Link>
            <Link to="/annonceur/briefs" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition">
              Mes briefs
            </Link>
            <Link to="/annonceur/briefs/nouveau" className="rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/20 transition">
              + Nouveau brief
            </Link>
            <Link to="/" hash="spots" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition">
              + Nouvelle campagne
            </Link>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-muted-foreground mb-4">Vous n'avez pas encore de campagne.</p>
            <Link to="/" hash="spots" className="text-primary font-semibold hover:underline">Parcourir les véhicules →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="font-semibold">{r.spot_name}</div>
                    <div className="text-xs text-muted-foreground">{r.spot_location} · {r.spot_price}€/jour</div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-xl">{r.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge status={r.status} />
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                <CampaignStepper
                  status={r.status}
                  paymentStatus={r.payment_status}
                  installationStatus={r.installation_status}
                  subscriptionStatus={r.subscription_status}
                />
                {r.admin_notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
                    <strong>Motif :</strong> {r.admin_notes}
                  </div>
                )}
                <StatusHistory
                  entityType="campaign_status"
                  entityId={r.id}
                  statusLabel={{ pending: "En attente", approved: "Validée", rejected: "Refusée" }}
                  triggerLabel="Historique de la demande"
                />
                <RouteSummary zones={r.route_zones} waypoints={r.route_waypoints} pois={r.route_pois} impressionsPerDay={r.estimated_impressions_per_day} days={r.days_count} />
                <CreativeFiles paths={r.creative_files} />
                {r.status === "approved" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <PaymentBadge status={r.payment_status} />
                    {r.subscription_status && <SubscriptionBadge status={r.subscription_status} />}
                    {r.payment_status !== "paid" && r.total_price != null && (
                      <button
                        onClick={() => handlePay(r)}
                        disabled={paying === r.id}
                        className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                      >
                        {paying === r.id ? "Paiement…" : `Payer ${Number(r.total_price).toFixed(2)} € avec mon portefeuille`}
                      </button>
                    )}
                    <Link to="/annonceur/suivi/$campaignId" params={{ campaignId: r.id }} className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition">
                      📍 Suivre en direct
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-2">Aperçu illustratif des flux de véhicules</h2>
          <p className="text-sm text-muted-foreground mb-4">Visualisation indicative — données réelles branchées progressivement.</p>
          <MobilityMap />
        </section>

        <div className="mt-10 rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">📜 Propriété intellectuelle :</strong> en soumettant un visuel publicitaire, vous garantissez en détenir tous les droits (créations, marques, droit à l'image, musiques) et vous engagez à respecter la législation française et européenne. Tout contenu litigieux est refusé.
        </div>
      </main>
      <FAQChatbot
        audience="annonceur"
        suggestions={[
          "Comment payer ma campagne validée ?",
          "Combien de temps dure la validation de ma campagne ?",
          "Quels contenus publicitaires sont interdits ?",
          "Comment recharger mon portefeuille ?",
          "À quoi sert un brief ?",
        ]}
      />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    approved: { label: "Validée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/20 text-destructive" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "À payer", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    paid: { label: "Payée ✓", cls: "bg-signal/20 text-signal" },
    refunded: { label: "Remboursée", cls: "bg-secondary text-foreground" },
    partial_refund: { label: "Remb. partiel", cls: "bg-secondary text-foreground" },
  };
  const s = map[status] ?? map.unpaid;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function SubscriptionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trialing: { label: "Essai gratuit en cours", cls: "bg-signal/20 text-signal" },
    active: { label: "Abonnement actif", cls: "bg-signal/20 text-signal" },
    past_due: { label: "Paiement échoué", cls: "bg-destructive/20 text-destructive" },
    unpaid: { label: "Impayé", cls: "bg-destructive/20 text-destructive" },
    canceled: { label: "Abonnement résilié", cls: "bg-secondary text-foreground" },
    incomplete: { label: "Souscription en cours", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  };
  const s = map[status];
  if (!s) return null;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}
