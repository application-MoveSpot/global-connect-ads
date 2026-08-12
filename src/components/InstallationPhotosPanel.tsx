import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  INSTALLATION_VIEWS,
  INSTALLATION_VIEW_LABEL,
  submitInstallationPhotos,
  type InstallationView,
} from "@/lib/installation.functions";
import {
  InstallationPhotoGrid,
  parseInstallationPhotos,
} from "@/components/InstallationPhotoGrid";
import { StatusHistory } from "@/components/StatusHistory";

type Props = {
  campaignRequestId: string;
  installationPhotos: unknown;
  installationStatus: string | null;
  installationNotes: string | null;
  onSubmitted?: () => void;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pose non transmise", className: "text-muted-foreground" },
  pending_approval: { label: "⏳ En attente de validation MoveSpot", className: "text-amber-500" },
  approved: { label: "✅ Pose validée — diffusion autorisée", className: "text-emerald-500" },
  rejected: { label: "⛔ Pose refusée — nouvelle pose conforme requise", className: "text-destructive" },
};

export function InstallationPhotosPanel({
  campaignRequestId,
  installationPhotos,
  installationStatus,
  installationNotes,
  onSubmitted,
}: Props) {
  const submit = useServerFn(submitInstallationPhotos);
  const [files, setFiles] = useState<Partial<Record<InstallationView, File>>>({});
  const [busy, setBusy] = useState(false);

  const existing = parseInstallationPhotos(installationPhotos);
  const status = STATUS[installationStatus ?? "pending"] ?? STATUS["pending"]!;
  const canSubmit = INSTALLATION_VIEWS.every((v) => files[v]) && !busy;

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Session expirée, reconnectez-vous.");

      const paths: Record<string, string> = {};
      for (const view of INSTALLATION_VIEWS) {
        const file = files[view]!;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${uid}/installations/${campaignRequestId}/${view}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("campaign-creatives")
          .upload(path, file, { upsert: true });
        if (error) throw new Error(error.message);
        paths[view] = path;
      }

      await submit({
        data: {
          campaignRequestId,
          photos: paths as { front: string; left: string; right: string; rear: string },
        },
      });
      toast.success("Photos de pose transmises — en attente de validation MoveSpot.");
      setFiles({});
      onSubmitted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">📸 Validation de la pose du support publicitaire</p>
        <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
      </div>
      {installationNotes ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          Motif MoveSpot : {installationNotes}
        </p>
      ) : null}

      <div className="mb-3">
        <StatusHistory
          entityType="campaign_installation"
          entityId={campaignRequestId}
          statusLabel={{
            pending: "Pose non transmise",
            pending_approval: "En attente de validation",
            approved: "Pose validée",
            rejected: "Pose refusée",
          }}
          triggerLabel="Historique des poses / refus"
        />
      </div>

      {existing ? (
        <div className="mb-3">
          <InstallationPhotoGrid photos={existing} />
        </div>
      ) : null}

      {installationStatus !== "approved" ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Transmettez les quatre vues du véhicule après pose du covering.
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {INSTALLATION_VIEWS.map((view) => (
              <label key={view} className="text-[11px] text-muted-foreground">
                {INSTALLATION_VIEW_LABEL[view]}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, [view]: e.target.files?.[0] }))
                  }
                  className="mt-1 block w-full text-[11px]"
                />
              </label>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Transmettre les 4 photos de pose"}
          </button>
        </>
      ) : null}
    </div>
  );
}
