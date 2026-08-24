import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { Button } from "@/components/ui/button";
import {
  adminApproveBrief,
  adminApproveCampaign,
  adminCertifyPoseur,
  adminFleetLatestPositions,
  adminListBriefsAndCampaigns,
  adminListInstallations,
  adminListInactiveStripeAccounts,
  adminListPoseurs,
  adminReviewInstallation,
  adminSendStripeReminder,
} from "@/lib/admin.functions";
import { InstallationPhotoGrid, parseInstallationPhotos } from "@/components/driver/InstallationPhotoGrid";
import { StatusHistory } from "@/components/shared/StatusHistory";

const FleetMap = lazy(() => import("@/components/owner/FleetMap"));

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Modération MoveSpot — Espace admin" },
      { name: "description", content: "Espace de modération MoveSpot : briefs, certifications poseurs et suivi de flotte." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDashboard,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

type Tab = "briefs" | "poses" | "poseurs" | "fleet" | "stripe";

function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("briefs");
  const [ready, setReady] = useState(false);

  const listBriefs = useServerFn(adminListBriefsAndCampaigns);
  const listInstallations = useServerFn(adminListInstallations);
  const reviewInstallation = useServerFn(adminReviewInstallation);
  const listPoseurs = useServerFn(adminListPoseurs);
  const fleet = useServerFn(adminFleetLatestPositions);
  const listInactiveStripe = useServerFn(adminListInactiveStripeAccounts);
  const approveCampaign = useServerFn(adminApproveCampaign);
  const approveBrief = useServerFn(adminApproveBrief);
  const certify = useServerFn(adminCertifyPoseur);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  const briefsQuery = useQuery({
    queryKey: ["admin-briefs"],
    queryFn: () => listBriefs(),
    enabled: ready && tab === "briefs",
    retry: false,
  });
  const poseursQuery = useQuery({
    queryKey: ["admin-poseurs"],
    queryFn: () => listPoseurs(),
    enabled: ready && tab === "poseurs",
    retry: false,
  });
  const installationsQuery = useQuery({
    queryKey: ["admin-installations"],
    queryFn: () => listInstallations(),
    enabled: ready && tab === "poses",
    retry: false,
  });
  const reviewMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; notes?: string }) =>
      reviewInstallation({
        data: { campaignRequestId: v.id, approve: v.approve, notes: v.notes },
      }),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "Pose validée — diffusion autorisée." : "Pose refusée.");
      qc.invalidateQueries({ queryKey: ["admin-installations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const fleetQuery = useQuery({
    queryKey: ["admin-fleet"],
    queryFn: () => fleet(),
    enabled: ready && tab === "fleet",
    refetchInterval: 30000,
    retry: false,
  });
  const sendReminder = useServerFn(adminSendStripeReminder);
  const stripeQuery = useQuery({
    queryKey: ["admin-stripe-inactive"],
    queryFn: () => listInactiveStripe(),
    enabled: ready && tab === "stripe",
    retry: false,
  });

  const approveCampaignMut = useMutation({
    mutationFn: (id: string) => approveCampaign({ data: { campaignRequestId: id, approve: true } }),
    onSuccess: () => {
      toast.success("Campagne approuvée — recherche de chauffeurs lancée.");
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const approveBriefMut = useMutation({
    mutationFn: (id: string) => approveBrief({ data: { briefId: id, approve: true } }),
    onSuccess: () => {
      toast.success("Brief approuvé et publié aux propriétaires.");
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const certifyMut = useMutation({
    mutationFn: (id: string) => certify({ data: { payeeProfileId: id, certified: true } }),
    onSuccess: () => {
      toast.success("Garage certifié.");
      qc.invalidateQueries({ queryKey: ["admin-poseurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const error =
    briefsQuery.error ?? installationsQuery.error ?? poseursQuery.error ?? fleetQuery.error ?? stripeQuery.error;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <LogoLink />
            <h1 className="mt-1 font-display text-2xl font-bold">Espace modération</h1>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <TabBtn active={tab === "briefs"} onClick={() => setTab("briefs")}>Briefs & Campagnes</TabBtn>
          <TabBtn active={tab === "poses"} onClick={() => setTab("poses")}>Poses à valider</TabBtn>
          <TabBtn active={tab === "poseurs"} onClick={() => setTab("poseurs")}>Certifications poseurs</TabBtn>
          <TabBtn active={tab === "fleet"} onClick={() => setTab("fleet")}>Suivi flotte</TabBtn>
          <TabBtn active={tab === "stripe"} onClick={() => setTab("stripe")}>
            Stripe inactifs
            {(stripeQuery.data
              ? stripeQuery.data.incomplete.length + stripeQuery.data.neverStarted.length
              : 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                {stripeQuery.data!.incomplete.length + stripeQuery.data!.neverStarted.length}
              </span>
            )}
          </TabBtn>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : null}

        {tab === "briefs" ? (
          briefsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 font-display text-lg font-bold">
                  Campagnes à modérer ({briefsQuery.data?.campaigns.length ?? 0})
                </h2>
                <div className="space-y-3">
                  {(briefsQuery.data?.campaigns ?? []).map((c) => (
                    <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{c.spot_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.company} · {c.start_date} → {c.end_date} · {c.days_count ?? "?"} j
                            {c.zone_area_km2 ? ` · ${Number(c.zone_area_km2).toFixed(1)} km²` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Statut : {c.status} · Paiement : {c.payment_status} ·{" "}
                            {c.total_price ? `${c.total_price} €` : "montant non défini"} ·{" "}
                            {c.creative_files?.length ?? 0} visuel(s)
                          </p>
                          <div className="mt-2">
                            <StatusHistory
                              entityType="campaign_status"
                              entityId={c.id}
                              statusLabel={{ pending: "En attente", approved: "Validée", rejected: "Refusée" }}
                            />
                          </div>
                        </div>
                        {c.status !== "approved" ? (
                          <Button
                            onClick={() => approveCampaignMut.mutate(c.id)}
                            disabled={approveCampaignMut.isPending}
                          >
                            Approuver le visuel et la zone
                          </Button>
                        ) : (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            Approuvée
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(briefsQuery.data?.campaigns ?? []).length === 0 ? (
                    <Empty>Aucune campagne pour l'instant.</Empty>
                  ) : null}
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-display text-lg font-bold">
                  Briefs annonceurs ({briefsQuery.data?.briefs.length ?? 0})
                </h2>
                <div className="space-y-3">
                  {(briefsQuery.data?.briefs ?? []).map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{b.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {b.start_date} → {b.end_date} · {b.days_count ?? "?"} j
                            {b.zone_area_km2 ? ` · ${Number(b.zone_area_km2).toFixed(1)} km²` : ""}
                            {b.budget_max ? ` · budget max ${b.budget_max} €` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Statut : {b.status} · {b.creative_files?.length ?? 0} visuel(s) ·{" "}
                            {(b.zones ?? []).join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => approveBriefMut.mutate(b.id)}
                          disabled={approveBriefMut.isPending}
                        >
                          Approuver le visuel et la zone
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(briefsQuery.data?.briefs ?? []).length === 0 ? (
                    <Empty>Aucun brief soumis.</Empty>
                  ) : null}
                </div>
              </section>
            </div>
          )
        ) : null}

        {tab === "poses" ? (
          installationsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Photos transmises par les poseurs certifiés. La diffusion et la rémunération ne
                démarrent qu'après votre validation.
              </p>
              {(installationsQuery.data?.installations ?? []).map((i) => (
                <InstallationReviewCard
                  key={i.id}
                  item={i}
                  onReview={(approve, notes) => reviewMut.mutate({ id: i.id, approve, notes })}
                  pending={reviewMut.isPending}
                />
              ))}
              {(installationsQuery.data?.installations ?? []).length === 0 ? (
                <Empty>Aucune pose transmise pour le moment.</Empty>
              ) : null}
            </div>
          )
        ) : null}



        {tab === "poseurs" ? (
          poseursQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-3">
              {(poseursQuery.data?.poseurs ?? []).map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {p.full_name}{" "}
                        <span className="text-xs text-muted-foreground">({p.kind})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.city ?? "—"} · {p.siret_denomination ?? p.siret ?? "SIRET non renseigné"}
                        {p.vehicle_kind ? ` · ${p.vehicle_kind}` : ""}
                        {p.vehicle_plate ? ` · ${p.vehicle_plate}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Certification : {p.certification_status} · Statut : {p.status} · Virements
                        Stripe : {p.stripe_payouts_enabled ? "actifs" : "inactifs"}
                      </p>
                      <div className="mt-2">
                        <StatusHistory
                          entityType="payee_certification"
                          entityId={p.id}
                          statusLabel={{ pending: "En attente", certified: "Certifié", rejected: "Refusé" }}
                        />
                      </div>
                    </div>
                    {p.certification_status !== "certified" ? (
                      <Button onClick={() => certifyMut.mutate(p.id)} disabled={certifyMut.isPending}>
                        Certifier le garage
                      </Button>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        🏅 Certifié
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(poseursQuery.data?.poseurs ?? []).length === 0 ? (
                <Empty>Aucun poseur inscrit.</Empty>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "fleet" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dernier point GPS reçu pour chaque véhicule des campagnes actives ·{" "}
              {fleetQuery.data?.points.length ?? 0} véhicule(s) · actualisation automatique toutes les
              30 s.
            </p>
            <ClientOnly fallback={<Skeleton />}>
              <Suspense fallback={<Skeleton />}>
                <FleetMap points={fleetQuery.data?.points ?? []} />
              </Suspense>
            </ClientOnly>
          </div>
        ) : null}

        {tab === "stripe" ? (
          stripeQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-1 font-display text-lg font-bold">
                  Onboarding incomplet ({stripeQuery.data?.incomplete.length ?? 0})
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Ces prestataires ont démarré la liaison Stripe Express mais n'ont pas finalisé leur onboarding — ils ne peuvent pas encore recevoir de virements.
                </p>
                <div className="space-y-3">
                  {(stripeQuery.data?.incomplete ?? []).map((p) => (
                    <StripeAccountRow key={p.id} account={p} badge="Onboarding incomplet" badgeColor="amber" onSendReminder={() => sendReminder({ data: { payeeProfileId: p.id } })} />
                  ))}
                  {(stripeQuery.data?.incomplete ?? []).length === 0 && (
                    <Empty>Aucun compte avec onboarding incomplet.</Empty>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-1 font-display text-lg font-bold">
                  Jamais démarré Stripe — inscrits depuis &gt; 30 j ({stripeQuery.data?.neverStarted.length ?? 0})
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Ces prestataires sont inscrits depuis plus de 30 jours mais n'ont pas encore lié de compte Stripe Express — aucun reversement ne peut leur être versé.
                </p>
                <div className="space-y-3">
                  {(stripeQuery.data?.neverStarted ?? []).map((p) => (
                    <StripeAccountRow key={p.id} account={p} badge="Stripe non lié" badgeColor="red" onSendReminder={() => sendReminder({ data: { payeeProfileId: p.id } })} />
                  ))}
                  {(stripeQuery.data?.neverStarted ?? []).length === 0 && (
                    <Empty>Aucun prestataire sans Stripe après 30 jours.</Empty>
                  )}
                </div>
              </section>
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

type StripeAccount = {
  id: string;
  user_id: string;
  kind: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  status: string;
  created_at: string;
};

function StripeAccountRow({
  account,
  badge,
  badgeColor,
  onSendReminder,
}: {
  account: StripeAccount;
  badge: string;
  badgeColor: "amber" | "red";
  onSendReminder: () => Promise<unknown>;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReminder = async () => {
    setSending(true);
    try {
      await onSendReminder();
      setSent(true);
      toast.success("Rappel envoyé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const daysSince = Math.floor(
    (Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {account.full_name}{" "}
            <span className="text-xs text-muted-foreground">({account.kind})</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {account.city ?? "—"} · {account.phone ?? "Tél. non renseigné"} · inscrit il y a{" "}
            {daysSince} j
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stripe ID : {account.stripe_account_id ?? "aucun"} · Charges :{" "}
            {account.stripe_charges_enabled ? "✅" : "⛔"} · Virements :{" "}
            {account.stripe_payouts_enabled ? "✅" : "⛔"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              badgeColor === "amber"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {badge}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReminder}
            disabled={sending || sent}
          >
            {sent ? "Rappel envoyé ✓" : sending ? "Envoi…" : "Envoyer un rappel email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type InstallationItem = {
  id: string;
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  installation_photos: unknown;
  installation_status: string | null;
  installation_notes: string | null;
};

function InstallationReviewCard({
  item,
  onReview,
  pending,
}: {
  item: InstallationItem;
  onReview: (approve: boolean, notes?: string) => void;
  pending: boolean;
}) {
  const [notes, setNotes] = useState("");
  const photos = parseInstallationPhotos(item.installation_photos);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.spot_name}</p>
          <p className="text-sm text-muted-foreground">
            {item.company} · {item.start_date ?? "—"} → {item.end_date ?? "—"}
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          Statut pose : {item.installation_status ?? "pending"}
        </span>
      </div>

      {photos ? <InstallationPhotoGrid photos={photos} /> : (
        <p className="text-sm text-muted-foreground">Aucune photo disponible.</p>
      )}

      {item.installation_notes ? (
        <p className="mt-3 text-xs text-muted-foreground">Note : {item.installation_notes}</p>
      ) : null}

      <div className="mt-3">
        <StatusHistory
          entityType="campaign_installation"
          entityId={item.id}
          statusLabel={{
            pending: "Pose non transmise",
            pending_approval: "En attente de validation",
            approved: "Pose validée",
            rejected: "Pose refusée",
          }}
        />
      </div>

      {item.installation_status !== "approved" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => onReview(true)} disabled={pending}>
            Approuver la pose
          </Button>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motif de refus (obligatoire)"
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            onClick={() => onReview(false, notes)}
            disabled={pending || !notes.trim()}
          >
            Refuser
          </Button>
        </div>
      ) : null}
    </div>
  );
}
