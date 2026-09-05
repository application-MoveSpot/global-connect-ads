import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics/track";
import { toast } from "sonner";
import { LogoLink } from "@/components/app/LogoLink";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { CampaignTrialCheckout } from "@/components/advertiser/CampaignTrialCheckout";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { RefreshCw, Wallet, FileText } from "lucide-react";
import { RouteError } from "@/components/app/RouteError";
import { acceptBriefProposal } from "@/lib/campaigns/brief-to-campaign.server";
import { SignalementDialog } from "@/components/shared/SignalementDialog";

export const Route = createFileRoute("/annonceur/briefs/$briefId")({
  head: () => ({
    meta: [
      { title: "Détail du brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BriefDetailPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Brief = {
  id: string;
  advertiser_id: string;
  title: string;
  description: string;
  vehicle_types: string[];
  zones: string[];
  start_date: string;
  end_date: string;
  days_count: number | null;
  budget_max: number | null;
  audience_target: string | null;
  creative_files: string[] | null;
  status: string;
};

type Proposal = {
  id: string;
  vehicle_id: string;
  owner_id: string;
  price_per_day: number;
  message: string | null;
  status: string;
  created_at: string;
};

type Vehicle = { id: string; name: string; type: string; photos: string[] | null; format_publicitaire: string | null };

function BriefDetailPage() {
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [accountType, setAccountType] = useState<string | null>(null);
  // Maps proposalId → campaign_request.id (populated on accept)
  const [campaignRequestIds, setCampaignRequestIds] = useState<Record<string, string>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const doAcceptProposal = useServerFn(acceptBriefProposal);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
    const [{ data: b }, { data: prof }] = await Promise.all([
      supabase.from("advertiser_briefs").select("*").eq("id", briefId).maybeSingle(),
      supabase.from("advertiser_profiles").select("account_type").eq("user_id", sess.session.user.id).maybeSingle(),
    ]);
    if (!b) { navigate({ to: "/annonceur/briefs" }); return; }
    setBrief(b as Brief);
    setAccountType((prof as { account_type?: string } | null)?.account_type ?? null);
    const { data: ps } = await supabase.from("brief_proposals").select("*").eq("brief_id", briefId).order("created_at", { ascending: false });
    const list = (ps as Proposal[]) ?? [];
    setProposals(list);
    if (list.length > 0) {
      const { data: vs } = await supabase.from("vehicles").select("id, name, type, photos, format_publicitaire").in("id", list.map((p) => p.vehicle_id));
      const map: Record<string, Vehicle> = {};
      for (const v of (vs as Vehicle[]) ?? []) map[v.id] = v;
      setVehicles(map);
    }
    setLoading(false);
  }, [briefId, navigate]);

  useEffect(() => { load(); }, [load]);

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const avgPricePerDay = acceptedProposals.length
    ? acceptedProposals.reduce((s, p) => s + Number(p.price_per_day ?? 0), 0) / acceptedProposals.length
    : 0;
  const estimatedTotal = acceptedProposals.reduce(
    (s, p) => s + Number(p.price_per_day ?? 0) * (brief?.days_count ?? 0),
    0,
  );


  const respond = async (id: string, status: "accepted" | "rejected") => {
    if (status === "rejected") {
      await supabase.from("brief_proposals").update({ status }).eq("id", id);
      void track("proposal_rejected", { proposal_id: id, brief_id: briefId });
      await load();
      return;
    }

    // Accepted: create campaign_request via server function
    setRespondingId(id);
    try {
      const result = await doAcceptProposal({ data: { proposalId: id, briefId } });
      void track("proposal_accepted", { proposal_id: id, brief_id: briefId, campaign_request_id: result.campaignRequestId });
      setCampaignRequestIds((prev) => ({ ...prev, [id]: result.campaignRequestId }));

      if (result.settled) {
        toast.success("Campagne activée ! Votre portefeuille a été débité.");
      } else if (result.insufficientFunds) {
        toast.warning("Proposition acceptée — rechargez votre portefeuille pour activer la campagne.");
      }

      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'acceptation.");
    } finally {
      setRespondingId(null);
    }
  };

  const cancelBrief = async () => {
    if (!confirm("Annuler ce brief ?")) return;
    await supabase.from("advertiser_briefs").update({ status: "cancelled" }).eq("id", briefId);
    await load();
  };

  const isIndividual = accountType === "individual";

  const daysUntilStart = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(brief?.start_date ?? ""); start.setHours(0, 0, 0, 0);
    return Math.round((start.getTime() - today.getTime()) / 86400000);
  })();

  if (loading || !brief) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur/briefs" className="text-sm text-muted-foreground hover:text-foreground">← Mes briefs</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Compte à rebours événement pour les particuliers */}
        {isIndividual && brief.status === "open" && daysUntilStart > 0 && (
          <div className={`mb-5 rounded-xl px-4 py-3 flex items-center gap-3 ${daysUntilStart <= 7 ? "bg-amber-500/10 border border-amber-500/30" : "bg-primary/5 border border-primary/20"}`}>
            <span className="text-2xl">{daysUntilStart <= 7 ? "⏰" : "📅"}</span>
            <div>
              <p className={`text-sm font-semibold ${daysUntilStart <= 7 ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}>
                {daysUntilStart <= 7
                  ? `Votre événement est dans ${daysUntilStart} jour${daysUntilStart > 1 ? "s" : ""} — acceptez une proposition rapidement.`
                  : `J-${daysUntilStart} avant votre événement`}
              </p>
              {proposals.filter((p) => p.status === "pending").length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {proposals.filter((p) => p.status === "pending").length} proposition{proposals.filter((p) => p.status === "pending").length > 1 ? "s" : ""} en attente de votre réponse
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{brief.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Du {new Date(brief.start_date).toLocaleDateString("fr-FR")} au {new Date(brief.end_date).toLocaleDateString("fr-FR")} ({brief.days_count} jour(s))
            </p>
          </div>
          <StatusBadge status={brief.status} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{brief.description}</p>
          <div className="text-xs text-muted-foreground"><strong>Types recherchés :</strong> {brief.vehicle_types.join(", ")}</div>
          {brief.zones.length > 0 && <div className="text-xs text-muted-foreground"><strong>Zones :</strong> {brief.zones.join(", ")}</div>}
          {brief.budget_max && <div className="text-xs text-muted-foreground"><strong>Budget max :</strong> {brief.budget_max}€</div>}
          {brief.audience_target && <div className="text-xs text-muted-foreground"><strong>Audience :</strong> {brief.audience_target}</div>}
          <CreativeFiles paths={brief.creative_files} />
        </section>

        {acceptedProposals.length > 0 && (
          <section className="rounded-2xl border border-primary/40 bg-primary/5 p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="font-display text-2xl font-bold">Récapitulatif du devis</h2>
              <Link
                to="/annonceur/contrat/$briefId"
                params={{ briefId }}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
              >
                <FileText className="h-4 w-4" />
                Devis PDF
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Configuration de campagne validée.</p>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Véhicules retenus</dt>
                <dd className="font-semibold">{acceptedProposals.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Durée</dt>
                <dd className="font-semibold">{brief.days_count ?? 0} jour(s)</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Prix moyen / véhicule / jour</dt>
                <dd className="font-semibold">{avgPricePerDay.toFixed(2)} €</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2 mt-2">
                <dt className="font-semibold">Total estimé de la campagne</dt>
                <dd className="font-display text-lg font-bold text-primary">{estimatedTotal.toFixed(2)} €</dd>
              </div>
            </dl>

            <div className="mt-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                {isIndividual ? "Activez votre campagne :" : "Comment souhaitez-vous activer cette campagne ?"}
              </p>

              {isIndividual ? (
                <div className="rounded-xl border border-primary bg-primary/5 p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-sm">Paiement via portefeuille</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Votre portefeuille se débite automatiquement quand vous acceptez une proposition.
                    Si votre solde est insuffisant, rechargez le montant de votre pack événement.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/annonceur/portefeuille"
                      className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition"
                    >
                      💳 Mon portefeuille
                    </Link>
                    <Link
                      to="/annonceur/pack"
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition"
                    >
                      🎪 Packs événement
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-primary bg-primary/5 p-4 ring-1 ring-primary/30">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Abonnement mensuel</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      14 jours d'essai gratuit pour{" "}
                      <strong>{acceptedProposals.length} véhicule{acceptedProposals.length > 1 ? "s" : ""}</strong>.
                      Aucun prélèvement pendant l'essai · résiliable à tout moment.
                    </p>
                    <CampaignTrialCheckout
                      campaignRequestId={
                        // Use the first accepted proposal's campaign_request.id if available
                        campaignRequestIds[acceptedProposals[0]?.id] ?? brief.id
                      }
                      vehicleQuantity={acceptedProposals.length}
                      buttonLabel="Activer l'essai gratuit de 14 jours"
                      className="w-full"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-sm">Portefeuille prépayé</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      Rechargez votre portefeuille et payez vos campagnes en une fois,
                      sans abonnement. Idéal pour les budgets B2B ou les campagnes ponctuelles.
                    </p>
                    <Link
                      to="/annonceur/portefeuille"
                      className="block w-full rounded-lg border border-border bg-secondary px-4 py-2 text-center text-sm font-semibold hover:bg-secondary/70 transition"
                    >
                      Gérer mon portefeuille →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}


        {brief.status === "open" && (
          <button onClick={cancelBrief} className="mb-6 text-xs text-destructive hover:underline">Annuler ce brief</button>
        )}

        <h2 className="font-display text-2xl font-bold mb-4">
          {isIndividual ? "Véhicules disponibles pour votre événement" : "Propositions reçues"} ({proposals.length})
        </h2>
        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            {isIndividual
              ? "Aucun véhicule proposé pour l'instant. Les propriétaires de votre zone seront notifiés automatiquement."
              : "Aucune proposition pour l'instant. Les propriétaires éligibles seront notifiés."}
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const v = vehicles[p.vehicle_id];
              const totalForBrief = Number(p.price_per_day) * (brief.days_count ?? 0);
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-4">
                    {v?.photos?.[0] && <VehicleThumb src={v.photos[0]} alt={v.name} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{v?.name ?? "Véhicule"}</div>
                          <div className="text-xs text-muted-foreground">{v?.type} {v?.format_publicitaire && `· ${v.format_publicitaire}`}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-lg font-bold text-primary">{p.price_per_day}€<span className="text-xs font-normal text-muted-foreground">/jour</span></div>
                          {isIndividual && brief.days_count && (
                            <div className="text-xs text-muted-foreground">= {totalForBrief.toFixed(0)} € total</div>
                          )}
                          <ProposalBadge status={p.status} />
                        </div>
                      </div>
                      {p.message && <p className="text-sm mt-2 whitespace-pre-wrap">{p.message}</p>}
                      {p.status === "pending" && brief.status === "open" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => respond(p.id, "accepted")}
                            disabled={respondingId === p.id}
                            className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-1.5 text-sm font-semibold hover:bg-signal/30 disabled:opacity-50"
                          >
                            {respondingId === p.id ? "…" : `✓ ${isIndividual ? "Choisir ce véhicule" : "Accepter"}`}
                          </button>
                          <button
                            onClick={() => respond(p.id, "rejected")}
                            disabled={respondingId === p.id}
                            className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-1.5 text-sm font-semibold hover:bg-destructive/25 disabled:opacity-50"
                          >
                            ✕ Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <SignalementDialog
            contextUrl={`/annonceur/briefs/${briefId}`}
            triggerLabel="Signaler un problème"
          />
        </div>
      </main>
    </div>
  );
}

function VehicleThumb({ src, alt }: { src: string; alt: string }) {
  const [url] = useVehiclePhotoUrls([src]);
  if (!url) return null;
  return (
    <div className="relative overflow-hidden rounded-lg flex-shrink-0 w-24 h-24">
      <img src={url} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 h-[22%] backdrop-blur-md bg-black/10 pointer-events-none" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Ouvert", cls: "bg-signal/20 text-signal" },
    closed: { label: "Fermé", cls: "bg-secondary text-foreground" },
    fulfilled: { label: "Pourvu", cls: "bg-primary/20 text-primary" },
    cancelled: { label: "Annulé", cls: "bg-destructive/15 text-destructive" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${x.cls}`}>{x.label}</span>;
}

function ProposalBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    accepted: { label: "Acceptée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
    withdrawn: { label: "Retirée", cls: "bg-muted text-muted-foreground" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${x.cls}`}>{x.label}</span>;
}
