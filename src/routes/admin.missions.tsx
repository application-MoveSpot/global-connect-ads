import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app/AppHeader";
import { RouteError } from "@/components/app/RouteError";
import { useCampaignMissions, useDispatchMission, useValidateMission, useMissionProofs } from "@/hooks/useMissions";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import {
  MISSION_STATUS_LABELS,
  MISSION_STATUS_COLORS,
  MISSION_TYPE_LABELS,
  type InstallationMission,
  type DispatchMissionPayload,
} from "@/lib/missions/types";
import { MapPin, Calendar, Truck, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";

// Tables nouvellement créées non encore dans les types auto-générés Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as any;

export const Route = createFileRoute("/admin/missions")({
  head: () => ({
    meta: [
      { title: "Admin · Missions Pose/Dépose — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminMissionsPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

// ─── Dispatch Form ───────────────────────────────────────────────────────────

type DispatchFormState = {
  campaign_request_id: string;
  mission_type: "pose" | "depose";
  location_lat: string;
  location_lng: string;
  location_address: string;
  location_city: string;
  scheduled_date: string;
  scheduled_time_slot: "matin" | "apres_midi" | "journee" | "flexible";
  fee_cents: string;
  radius_km: string;
};

const DEFAULT_FORM: DispatchFormState = {
  campaign_request_id: "",
  mission_type: "pose",
  location_lat: "",
  location_lng: "",
  location_address: "",
  location_city: "",
  scheduled_date: "",
  scheduled_time_slot: "flexible",
  fee_cents: "",
  radius_km: "30",
};

function DispatchForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<DispatchFormState>(DEFAULT_FORM);
  const dispatch = useDispatchMission();

  const set = (k: keyof DispatchFormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: DispatchMissionPayload = {
      campaign_request_id: form.campaign_request_id.trim(),
      mission_type: form.mission_type,
      location_lat: parseFloat(form.location_lat),
      location_lng: parseFloat(form.location_lng),
      location_address: form.location_address || undefined,
      location_city: form.location_city || undefined,
      scheduled_date: form.scheduled_date,
      scheduled_time_slot: form.scheduled_time_slot,
      fee_cents: Math.round(parseFloat(form.fee_cents) * 100),
      radius_km: parseFloat(form.radius_km),
    };
    try {
      const res = await dispatch.mutateAsync(payload);
      toast.success(
        `Mission créée — ${res.installers_notified} prestataire(s) notifié(s)`,
      );
      setForm(DEFAULT_FORM);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du dispatch");
    }
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>ID campagne *</label>
          <input
            required
            className={inputCls}
            value={form.campaign_request_id}
            onChange={(e) => set("campaign_request_id", e.target.value)}
            placeholder="UUID de la campagne"
          />
        </div>
        <div>
          <label className={labelCls}>Type de mission *</label>
          <select
            className={inputCls}
            value={form.mission_type}
            onChange={(e) => set("mission_type", e.target.value as "pose" | "depose")}
          >
            <option value="pose">Pose</option>
            <option value="depose">Dépose</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Latitude *</label>
          <input
            required
            type="number"
            step="any"
            className={inputCls}
            value={form.location_lat}
            onChange={(e) => set("location_lat", e.target.value)}
            placeholder="48.8566"
          />
        </div>
        <div>
          <label className={labelCls}>Longitude *</label>
          <input
            required
            type="number"
            step="any"
            className={inputCls}
            value={form.location_lng}
            onChange={(e) => set("location_lng", e.target.value)}
            placeholder="2.3522"
          />
        </div>
        <div>
          <label className={labelCls}>Adresse</label>
          <input
            className={inputCls}
            value={form.location_address}
            onChange={(e) => set("location_address", e.target.value)}
            placeholder="12 rue de la Paix"
          />
        </div>
        <div>
          <label className={labelCls}>Ville</label>
          <input
            className={inputCls}
            value={form.location_city}
            onChange={(e) => set("location_city", e.target.value)}
            placeholder="Paris"
          />
        </div>
        <div>
          <label className={labelCls}>Date prévue *</label>
          <input
            required
            type="date"
            className={inputCls}
            value={form.scheduled_date}
            onChange={(e) => set("scheduled_date", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Créneau</label>
          <select
            className={inputCls}
            value={form.scheduled_time_slot}
            onChange={(e) =>
              set(
                "scheduled_time_slot",
                e.target.value as DispatchFormState["scheduled_time_slot"],
              )
            }
          >
            <option value="flexible">Flexible</option>
            <option value="matin">Matin</option>
            <option value="apres_midi">Après-midi</option>
            <option value="journee">Journée</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Honoraires (€) *</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={form.fee_cents}
            onChange={(e) => set("fee_cents", e.target.value)}
            placeholder="150.00"
          />
        </div>
        <div>
          <label className={labelCls}>Rayon de recherche (km)</label>
          <input
            type="number"
            min="1"
            max="200"
            className={inputCls}
            value={form.radius_km}
            onChange={(e) => set("radius_km", e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={dispatch.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        <Send className="w-4 h-4" />
        {dispatch.isPending ? "Dispatch en cours…" : "Dispatcher la mission"}
      </button>
    </form>
  );
}

// ─── Mission Card ─────────────────────────────────────────────────────────────

function MissionCard({ mission }: { mission: InstallationMission }) {
  const [expanded, setExpanded] = useState(false);
  const [adminNotes, setAdminNotes] = useState(mission.admin_notes ?? "");
  const validate = useValidateMission();
  const proofs = useMissionProofs(expanded ? mission.id : "");

  const handleValidate = async () => {
    if (!confirm("Confirmer la validation de cette mission ?")) return;
    try {
      await validate.mutateAsync({ mission_id: mission.id, admin_notes: adminNotes || undefined });
      toast.success("Mission validée — virement en cours");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de validation");
    }
  };

  const statusCls = MISSION_STATUS_COLORS[mission.status] ?? "text-gray-500 bg-gray-100";
  const typeBadge =
    mission.mission_type === "pose"
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeBadge}`}>
              {MISSION_TYPE_LABELS[mission.mission_type]}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls}`}>
              {MISSION_STATUS_LABELS[mission.status]}
            </span>
            {mission.payout_status === "transferred" && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                Virement effectué
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground font-mono truncate">
            ID mission: {mission.id}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            Campagne: {mission.campaign_request_id}
          </p>

          {mission.payee_profile && (
            <p className="text-sm font-medium flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              {mission.payee_profile.full_name}
              {mission.payee_profile.city && (
                <span className="text-muted-foreground font-normal">
                  — {mission.payee_profile.city}
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {mission.location_city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {mission.location_city}
              </span>
            )}
            {mission.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(mission.scheduled_date).toLocaleDateString("fr-FR")}
                {mission.scheduled_time_slot !== "flexible" && ` · ${mission.scheduled_time_slot}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(mission.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>

          <p className="text-sm font-semibold">
            {(mission.fee_cents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </p>
        </div>

        <button
          onClick={() => setExpanded((p) => !p)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-secondary transition text-muted-foreground"
          aria-label={expanded ? "Réduire" : "Développer"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-secondary/30">
          {/* Preuves photos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Preuves photos ({proofs.data?.length ?? 0})
            </p>
            {proofs.isLoading ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : proofs.data && proofs.data.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {proofs.data.map((proof) => (
                  <a
                    key={proof.id}
                    href={proof.storage_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg overflow-hidden border border-border block w-20 h-20 hover:opacity-80 transition"
                  >
                    {proof.storage_url ? (
                      <img
                        src={proof.storage_url}
                        alt={proof.proof_type}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-xs text-muted-foreground">
                        {proof.proof_type}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aucune preuve soumise</p>
            )}
          </div>

          {/* Notes prestataire */}
          {mission.provider_notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Notes prestataire
              </p>
              <p className="text-sm">{mission.provider_notes}</p>
            </div>
          )}

          {/* Validation admin */}
          {mission.status === "pending_validation" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Validation admin
              </p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes administrateur (optionnel)…"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <button
                onClick={handleValidate}
                disabled={validate.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                <CheckCircle className="w-4 h-4" />
                {validate.isPending ? "Validation…" : "Valider la mission"}
              </button>
            </div>
          )}

          {mission.status === "validated" && (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              Validée le{" "}
              {mission.admin_reviewed_at
                ? new Date(mission.admin_reviewed_at).toLocaleDateString("fr-FR")
                : "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Missions Section ────────────────────────────────────────────────

function CampaignMissionsSection({ campaignId }: { campaignId: string }) {
  const { data: missions, isLoading, error } = useCampaignMissions(campaignId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return (
      <p className="text-sm text-red-500 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" /> {error.message}
      </p>
    );
  if (!missions || missions.length === 0)
    return <p className="text-sm text-muted-foreground">Aucune mission pour cette campagne.</p>;

  return (
    <div className="space-y-3">
      {missions.map((m) => (
        <MissionCard key={m.id} mission={m} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminMissionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authed, setAuthed] = useState<"checking" | "ok" | "denied">("checking");
  const [showDispatch, setShowDispatch] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Auth check
  useState(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/admin/connexion" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
        setAuthed("denied");
        return;
      }
      setAuthed("ok");
    })();
  });

  const handleDispatchSuccess = useCallback(() => {
    if (activeCampaignId) {
      queryClient.invalidateQueries({ queryKey: ["missions", "campaign", activeCampaignId] });
    }
  }, [activeCampaignId, queryClient]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const id = lookupId.trim();
    if (id) setActiveCampaignId(id);
  };

  if (authed === "checking")
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Vérification…
      </div>
    );

  if (authed === "denied")
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-muted-foreground mb-4">Vous n'êtes pas administrateur.</p>
          <button
            onClick={() => navigate({ to: "/admin/connexion" })}
            className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium"
          >
            Se connecter
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        right={
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour admin
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="font-display text-xl font-bold mb-6">Missions Pose / Dépose</h1>
        {/* Dispatch new mission */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <button
            onClick={() => setShowDispatch((p) => !p)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Dispatcher une nouvelle mission
            </h2>
            {showDispatch ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          {showDispatch && <DispatchForm onSuccess={handleDispatchSuccess} />}
        </section>

        {/* Lookup missions by campaign */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Missions d'une campagne
          </h2>
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="UUID de la campagne…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              Rechercher
            </button>
          </form>

          {activeCampaignId && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-mono">
                Campagne : {activeCampaignId}
              </p>
              <CampaignMissionsSection campaignId={activeCampaignId} />
            </div>
          )}
        </section>

        {/* Pending validations */}
        <PendingValidationsSection />
      </main>
    </div>
  );
}

// ─── Pending Validations (global list) ───────────────────────────────────────

function PendingValidationsSection() {
  const [missions, setMissions] = useState<InstallationMission[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      const { data, error } = await db
        .from("installation_missions")
        .select(`
          *,
          payee_profile:payee_profiles!payee_id ( id, user_id, full_name, city, phone, certification_status )
        `)
        .eq("status", "pending_validation")
        .order("updated_at", { ascending: true });
      if (!error) setMissions((data ?? []) as unknown as InstallationMission[]);
      setLoading(false);
    })();
  });

  return (
    <section className="rounded-xl border border-orange-200 bg-orange-50/40 p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-orange-700">
        <AlertCircle className="w-5 h-5" />
        En attente de validation ({loading ? "…" : missions.length})
      </h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : missions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune mission en attente de validation.
        </p>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      )}
    </section>
  );
}
