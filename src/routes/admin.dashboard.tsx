import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { Button } from "@/components/ui/button";
import {
  adminApproveBrief,
  adminApproveCampaign,
  adminCertifyPoseur,
  adminFleetLatestPositions,
  adminListBriefsAndCampaigns,
  adminListInstallations,
  adminListPoseurs,
  adminReviewInstallation,
} from "@/lib/admin.functions";
import { InstallationPhotoGrid, parseInstallationPhotos } from "@/components/InstallationPhotoGrid";

const FleetMap = lazy(() => import("@/components/FleetMap"));

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

type Tab = "briefs" | "poses" | "poseurs" | "fleet";

function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("briefs");
  const [ready, setReady] = useState(false);

  const listBriefs = useServerFn(adminListBriefsAndCampaigns);
  const listPoseurs = useServerFn(adminListPoseurs);
  const fleet = useServerFn(adminFleetLatestPositions);
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
  const fleetQuery = useQuery({
    queryKey: ["admin-fleet"],
    queryFn: () => fleet(),
    enabled: ready && tab === "fleet",
    refetchInterval: 30000,
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

  const error = briefsQuery.error ?? poseursQuery.error ?? fleetQuery.error;

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
          <TabBtn active={tab === "poseurs"} onClick={() => setTab("poseurs")}>Certifications poseurs</TabBtn>
          <TabBtn active={tab === "fleet"} onClick={() => setTab("fleet")}>Suivi flotte</TabBtn>
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
