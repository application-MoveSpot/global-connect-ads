import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Bot, CheckCircle2, ChevronRight, Clock, FileText, Shield, TrendingUp, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminCopiloteUrgences,
  adminCopiloteOpportunites,
  adminMarkModerationReviewed,
  adminSendBriefRelance,
  adminVerifyVehicleInsurance,
  adminVerifyInstallerRCPro,
  type CopiloteUrgences,
  type CopiloteOpportunite,
} from "@/lib/admin.functions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `il y a ${d}j`;
  if (h >= 1) return `il y a ${h}h`;
  return "récemment";
}

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {count === 0 ? "Aucun élément en attente" : `${count} élément${count > 1 ? "s" : ""} à traiter`}
        </p>
      </div>
      {count > 0 && (
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
          {count}
        </span>
      )}
    </div>
  );
}

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  variant = "outline",
  disabled = false,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: "outline" | "destructive" | "default";
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="destructive"
          className="text-xs h-7 px-2"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          disabled={disabled}
        >
          {confirmLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2"
          onClick={() => setConfirming(false)}
        >
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={variant}
      className="text-xs h-7 px-2"
      onClick={() => setConfirming(true)}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

// ── Sections urgences ─────────────────────────────────────────────────────────

function ModerationAlertsList({
  alerts,
  onReviewed,
}: {
  alerts: CopiloteUrgences["moderationAlerts"];
  onReviewed: (id: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Alerte modération — sévérité {Math.round(a.severity * 100)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Intent : <span className="text-foreground">{a.intent}</span> · {timeAgo(a.created_at)}
            </p>
            {a.suggested_action && (
              <p className="text-xs text-muted-foreground mt-1">
                Suggestion IA : <span className="italic">{a.suggested_action}</span>
              </p>
            )}
            {a.flags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {a.flags.map((f) => (
                  <span
                    key={f}
                    className="rounded px-1.5 py-0.5 bg-destructive/10 text-destructive text-[10px] font-medium"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ConfirmButton
            label="Marquer relu"
            confirmLabel="Confirmer"
            onConfirm={() => onReviewed(a.id)}
            variant="outline"
          />
        </div>
      ))}
    </div>
  );
}

function RefundReviewList({
  reviews,
}: {
  reviews: CopiloteUrgences["refundReviews"];
}) {
  if (reviews.length === 0) return null;
  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Remboursement — revue humaine requise</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Risque : <span className="font-medium text-foreground">{r.risk_score}</span> · {timeAgo(r.analyzed_at)}
            </p>
            {r.suggested_admin_note && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                Note IA : {r.suggested_admin_note}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 shrink-0"
            onClick={() => {
              window.location.href = "/admin/remboursements";
            }}
          >
            Consulter
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function VehicleInsuranceList({
  vehicles,
  onVerify,
}: {
  vehicles: CopiloteUrgences["vehiclesNoInsurance"];
  onVerify: (vehicleId: string) => void;
}) {
  if (vehicles.length === 0) return null;
  return (
    <div className="space-y-2">
      {vehicles.map((v) => (
        <div
          key={v.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{v.name || "Véhicule"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Type : {v.type} · Approuvé {timeAgo(v.created_at)}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              Assurance auto non vérifiée
            </p>
          </div>
          <ConfirmButton
            label="Vérifier assurance"
            confirmLabel="Confirmer la vérification"
            onConfirm={() => onVerify(v.id)}
            variant="outline"
          />
        </div>
      ))}
    </div>
  );
}

function PoseurRCProList({
  poseurs,
  onVerify,
}: {
  poseurs: CopiloteUrgences["poseurNoRCPro"];
  onVerify: (payeeProfileId: string) => void;
}) {
  if (poseurs.length === 0) return null;
  return (
    <div className="space-y-2">
      {poseurs.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{p.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Certifié depuis {timeAgo(p.created_at)}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              RC Pro non vérifiée
            </p>
          </div>
          <ConfirmButton
            label="Vérifier RC Pro"
            confirmLabel="Confirmer la vérification"
            onConfirm={() => onVerify(p.id)}
            variant="outline"
          />
        </div>
      ))}
    </div>
  );
}

// ── Sections opportunités ─────────────────────────────────────────────────────

function OrphanBriefsList({
  briefs,
  onRelance,
}: {
  briefs: CopiloteOpportunite["orphanBriefs"];
  onRelance: (briefId: string, advertiserId: string) => void;
}) {
  if (briefs.length === 0) return null;
  return (
    <div className="space-y-2">
      {briefs.map((b) => (
        <div
          key={b.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{b.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Publié {timeAgo(b.created_at)} · 0 proposition
              {b.budget_max ? ` · Budget ${b.budget_max}€` : ""}
            </p>
          </div>
          <ConfirmButton
            label="Approuver relance"
            confirmLabel="Envoyer la relance"
            onConfirm={() => onRelance(b.id, b.advertiser_id)}
            variant="default"
          />
        </div>
      ))}
    </div>
  );
}

function InactiveAdvertisersList({
  advertisers,
}: {
  advertisers: CopiloteOpportunite["inactiveAdvertisers"];
}) {
  if (advertisers.length === 0) return null;
  return (
    <div className="space-y-2">
      {advertisers.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {a.company ?? a.full_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inactif depuis {timeAgo(a.updated_at)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 shrink-0"
            onClick={() => {
              window.location.hash = "utilisateurs";
              window.location.reload();
            }}
          >
            <User className="h-3 w-3 mr-1" />
            Voir profil
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AdminCopilotePanel() {
  const qc = useQueryClient();

  const getUrgences = useServerFn(adminCopiloteUrgences);
  const getOpportunites = useServerFn(adminCopiloteOpportunites);
  const markReviewed = useServerFn(adminMarkModerationReviewed);
  const sendRelance = useServerFn(adminSendBriefRelance);
  const verifyInsurance = useServerFn(adminVerifyVehicleInsurance);
  const verifyRCPro = useServerFn(adminVerifyInstallerRCPro);

  const urgencesQuery = useQuery({
    queryKey: ["copilote-urgences"],
    queryFn: () => getUrgences({ data: undefined }),
    staleTime: 60_000,
  });

  const opportunitesQuery = useQuery({
    queryKey: ["copilote-opportunites"],
    queryFn: () => getOpportunites({ data: undefined }),
    staleTime: 120_000,
  });

  const markReviewedMut = useMutation({
    mutationFn: (alertId: string) => markReviewed({ data: { alertId } }),
    onSuccess: () => {
      toast.success("Alerte marquée comme relue");
      qc.invalidateQueries({ queryKey: ["copilote-urgences"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const verifyInsuranceMut = useMutation({
    mutationFn: (vehicleId: string) =>
      verifyInsurance({ data: { vehicleId, expiresAt: null } }),
    onSuccess: () => {
      toast.success("Assurance vérifiée");
      qc.invalidateQueries({ queryKey: ["copilote-urgences"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const verifyRCProMut = useMutation({
    mutationFn: (payeeProfileId: string) =>
      verifyRCPro({ data: { payeeProfileId, expiresAt: null } }),
    onSuccess: () => {
      toast.success("RC Pro vérifiée");
      qc.invalidateQueries({ queryKey: ["copilote-urgences"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const sendRelanceMut = useMutation({
    mutationFn: ({ briefId, advertiserId }: { briefId: string; advertiserId: string }) =>
      sendRelance({ data: { briefId, advertiserId } }),
    onSuccess: () => {
      toast.success("Relance envoyée à l'annonceur");
      qc.invalidateQueries({ queryKey: ["copilote-opportunites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const urgences = urgencesQuery.data;
  const opportunites = opportunitesQuery.data;

  const totalUrgences = urgences
    ? urgences.moderationAlerts.length +
      urgences.refundReviews.length +
      urgences.vehiclesNoInsurance.length +
      urgences.poseurNoRCPro.length
    : 0;

  const totalOpportunites = opportunites
    ? opportunites.orphanBriefs.length + opportunites.inactiveAdvertisers.length
    : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Copilote Admin</h2>
          <p className="text-sm text-muted-foreground">
            Synthèse des actions urgentes et opportunités de croissance
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto text-xs"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["copilote-urgences"] });
            qc.invalidateQueries({ queryKey: ["copilote-opportunites"] });
          }}
        >
          <Zap className="h-3.5 w-3.5 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Alertes modération",
            value: urgences?.moderationAlerts.length ?? "—",
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "text-destructive",
            bg: "bg-destructive/10",
          },
          {
            label: "Remboursements",
            value: urgences?.refundReviews.length ?? "—",
            icon: <FileText className="h-4 w-4" />,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Briefs orphelins",
            value: opportunites?.orphanBriefs.length ?? "—",
            icon: <Clock className="h-4 w-4" />,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Annonceurs dormants",
            value: opportunites?.inactiveAdvertisers.length ?? "—",
            icon: <TrendingUp className="h-4 w-4" />,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg} ${kpi.color} shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <p className={`text-lg font-bold leading-none ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 1 : Urgences ─────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<Shield className="h-4 w-4 text-destructive" />}
          title="Validations urgentes"
          count={totalUrgences}
          color="bg-destructive/10"
        />

        {urgencesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Chargement…</div>
        ) : urgencesQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(urgencesQuery.error as Error).message}
          </div>
        ) : totalUrgences === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            Aucune action urgente en attente — tout est à jour.
          </div>
        ) : (
          <div className="space-y-6">
            {urgences && urgences.moderationAlerts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Alertes de modération (sévérité ≥ 80 %)
                </p>
                <ModerationAlertsList
                  alerts={urgences.moderationAlerts}
                  onReviewed={(id) => markReviewedMut.mutate(id)}
                />
              </div>
            )}
            {urgences && urgences.refundReviews.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Demandes de remboursement — revue humaine
                </p>
                <RefundReviewList reviews={urgences.refundReviews} />
              </div>
            )}
            {urgences && urgences.vehiclesNoInsurance.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Véhicules approuvés — assurance non vérifiée
                </p>
                <VehicleInsuranceList
                  vehicles={urgences.vehiclesNoInsurance}
                  onVerify={(id) => verifyInsuranceMut.mutate(id)}
                />
              </div>
            )}
            {urgences && urgences.poseurNoRCPro.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Poseurs certifiés — RC Pro non vérifiée
                </p>
                <PoseurRCProList
                  poseurs={urgences.poseurNoRCPro}
                  onVerify={(id) => verifyRCProMut.mutate(id)}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Section 2 : Opportunités MatchOptimizer ──────────────────────── */}
      <section>
        <SectionHeader
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          title="Opportunités de croissance (MatchOptimizer)"
          count={totalOpportunites}
          color="bg-primary/10"
        />

        <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Guardrail :</span> Aucune relance n'est
          envoyée automatiquement. Chaque action requiert votre validation explicite.
        </div>

        {opportunitesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Chargement…</div>
        ) : opportunitesQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(opportunitesQuery.error as Error).message}
          </div>
        ) : totalOpportunites === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            Pas de brief orphelin ni d'annonceur dormant détecté.
          </div>
        ) : (
          <div className="space-y-6">
            {opportunites && opportunites.orphanBriefs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Briefs sans proposition depuis +48 h
                </p>
                <OrphanBriefsList
                  briefs={opportunites.orphanBriefs}
                  onRelance={(briefId, advertiserId) =>
                    sendRelanceMut.mutate({ briefId, advertiserId })
                  }
                />
              </div>
            )}
            {opportunites && opportunites.inactiveAdvertisers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Annonceurs inactifs depuis +21 jours
                </p>
                <InactiveAdvertisersList advertisers={opportunites.inactiveAdvertisers} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
