/**
 * /provider/missions — Espace missions du poseur certifié
 *
 * Affiche les missions d'installation assignées au poseur connecté.
 * Permet de signaler une pose impossible (art. 15bis) dans la fenêtre
 * de 24h suivant la date prévue.
 */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { PoseImpossibleModal } from "@/components/provider/PoseImpossibleModal";
import { useMyMissions } from "@/hooks/useMissions";
import {
  MISSION_STATUS_LABELS,
  MISSION_STATUS_COLORS,
  MISSION_TYPE_LABELS,
  type InstallationMission,
} from "@/lib/missions/types";

export const Route = createFileRoute("/provider/missions")({
  head: () => ({
    meta: [{ title: "Mes missions — MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ProviderMissionsPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function ProviderMissionsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [impossibleModal, setImpossibleModal] = useState<{
    open: boolean;
    mission: InstallationMission | null;
  }>({ open: false, mission: null });

  useEffect(() => {
    getOrRefreshSession().then((session) => {
      if (!session) {
        navigate({ to: "/provider/connexion" });
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
    });
  }, [navigate]);

  const { data: missions = [], isLoading, refetch } = useMyMissions(userId ?? "");

  if (!authReady || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  // Séparer missions actives et terminées
  const activeMissions = missions.filter(
    (m) => !["validated", "cancelled", "failed_technical_impossible"].includes(m.status),
  );
  const closedMissions = missions.filter((m) =>
    ["validated", "cancelled", "failed_technical_impossible"].includes(m.status),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-2 border-t-orange-400 border-b border-border backdrop-blur light-band">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <LogoLink />
          <div className="flex items-center gap-3">
            <Link
              to="/provider"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              ← Tableau de bord
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mes missions de pose</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Missions d'installation assignées à votre compte
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
        )}

        {!isLoading && missions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Aucune mission en cours.
          </div>
        )}

        {activeMissions.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3">
              Missions actives ({activeMissions.length})
            </h2>
            <div className="space-y-3">
              {activeMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onReportImpossible={(mission) => setImpossibleModal({ open: true, mission })}
                />
              ))}
            </div>
          </section>
        )}

        {closedMissions.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3">
              Historique ({closedMissions.length})
            </h2>
            <div className="space-y-3">
              {closedMissions.map((m) => (
                <MissionCard key={m.id} mission={m} onReportImpossible={null} />
              ))}
            </div>
          </section>
        )}
      </main>

      {impossibleModal.open && impossibleModal.mission && (
        <PoseImpossibleModal
          missionId={impossibleModal.mission.id}
          missionType={impossibleModal.mission.mission_type}
          scheduledDate={impossibleModal.mission.scheduled_date}
          payeeUserId={userId}
          onSuccess={() => {
            setImpossibleModal({ open: false, mission: null });
            void refetch();
          }}
          onCancel={() => setImpossibleModal({ open: false, mission: null })}
        />
      )}
    </div>
  );
}

function MissionCard({
  mission,
  onReportImpossible,
}: {
  mission: InstallationMission;
  onReportImpossible: ((m: InstallationMission) => void) | null;
}) {
  const isWithin24h = (): boolean => {
    if (!mission.scheduled_date) return true;
    const day = new Date(mission.scheduled_date);
    day.setHours(0, 0, 0, 0);
    const deadline = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    return new Date() <= deadline;
  };

  const canReportImpossible =
    onReportImpossible !== null &&
    ["assigned", "en_route", "in_progress"].includes(mission.status) &&
    isWithin24h();

  const statusLabel = MISSION_STATUS_LABELS[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLORS[mission.status] ?? "text-gray-600 bg-gray-100";
  const typeLabel = MISSION_TYPE_LABELS[mission.mission_type] ?? mission.mission_type;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3 justify-between mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm">
            {typeLabel} — <span className="font-mono text-xs">{mission.id.slice(0, 8)}</span>
          </div>
          {mission.location_address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {mission.location_address}
              {mission.location_city && `, ${mission.location_city}`}
            </div>
          )}
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
        {mission.scheduled_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {new Date(mission.scheduled_date).toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
        {mission.scheduled_time_slot && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {
              {
                matin: "Matin",
                apres_midi: "Après-midi",
                journee: "Journée",
                flexible: "Flexible",
              }[mission.scheduled_time_slot]
            }
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          Rémunération : {(mission.fee_cents / 100).toFixed(2)} €
        </div>
      </div>

      {/* Alerte pose impossible déjà signalée */}
      {mission.status === "failed_technical_impossible" && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 p-3 text-sm text-rose-700 dark:text-rose-300">
          <p className="font-semibold">Pose impossible signalée (art. 15bis)</p>
          {(mission as unknown as { pose_impossible_reason?: string }).pose_impossible_reason && (
            <p className="mt-1 text-xs opacity-80">
              Motif :{" "}
              {(mission as unknown as { pose_impossible_reason?: string }).pose_impossible_reason}
            </p>
          )}
          <p className="mt-1 text-xs opacity-70">
            Remboursement annonceur en cours de traitement — délai : 7 jours ouvrés.
          </p>
        </div>
      )}

      {/* Bouton signalement — visible uniquement dans la fenêtre 24h */}
      {canReportImpossible && (
        <div className="border-t border-border pt-3 mt-1">
          <button
            onClick={() => onReportImpossible!(mission)}
            className="rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/40 px-4 py-2 text-sm font-semibold hover:bg-rose-500/20 transition"
          >
            ⚠️ Signaler une pose impossible
          </button>
          <p className="text-xs text-muted-foreground mt-1.5">
            Délai : 24h après la date de pose prévue (art. 15bis CGU)
          </p>
        </div>
      )}

      {/* Délai dépassé — bouton désactivé avec explication */}
      {onReportImpossible !== null &&
        ["assigned", "en_route", "in_progress"].includes(mission.status) &&
        !isWithin24h() && (
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-xs text-muted-foreground">
              Délai de signalement dépassé (art. 15bis — 24h après la date prévue). Contactez
              MoveSpot par email si nécessaire.
            </p>
          </div>
        )}
    </div>
  );
}
