import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resizeImageFile } from "@/lib/images/resize";
import {
  adminListCampaignsMissingInstallation,
  adminSubmitSubsidiaryInstallationPhotos,
} from "@/lib/admin.functions";

type MissingCampaign = {
  id: string;
  spot_name: string | null;
  company: string | null;
  start_date: string | null;
  end_date: string | null;
  installation_status: string | null;
};

const VIEWS = ["front", "left", "right", "rear"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = {
  front: "Face avant",
  left: "Côté gauche",
  right: "Côté droit",
  rear: "Face arrière",
};

type UploadFormProps = {
  campaign: MissingCampaign;
  onDone: () => void;
};

function SubsidiaryUploadForm({ campaign, onDone }: UploadFormProps) {
  const submit = useServerFn(adminSubmitSubsidiaryInstallationPhotos);
  const [files, setFiles] = useState<Partial<Record<View, File>>>({});
  const [busy, setBusy] = useState(false);

  const allSelected = VIEWS.every((v) => files[v]);

  const handleSubmit = async () => {
    if (!allSelected) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Session expirée — veuillez vous reconnecter.");

      const paths: Partial<Record<View, string>> = {};
      for (const view of VIEWS) {
        const file = files[view]!;
        const resized = await resizeImageFile(file, 1600, 0.85);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${uid}/installations/${campaign.id}/${view}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("campaign-creatives")
          .upload(path, resized, { upsert: true });
        if (error) throw new Error(`Erreur upload ${VIEW_LABEL[view]} : ${error.message}`);
        paths[view] = path;
      }

      await submit({
        data: {
          campaignRequestId: campaign.id,
          photos: paths as { front: string; left: string; right: string; rear: string },
        },
      });

      toast.success("Photos soumises — campagne en attente de validation.");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
        Upload subsidiaire · CGU art. 15
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VIEWS.map((view) => (
          <div key={view} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{VIEW_LABEL[view]}</label>
            <label
              className={`flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs transition-colors ${
                files[view]
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                  : "border-border hover:border-primary/50 text-muted-foreground"
              }`}
            >
              <Upload className="mb-1 h-4 w-4" />
              {files[view] ? files[view]!.name.slice(0, 16) + "…" : "Choisir"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFiles((prev) => ({ ...prev, [view]: f }));
                }}
              />
            </label>
          </div>
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!allSelected || busy}
        size="sm"
        className="w-full"
      >
        {busy ? "Envoi en cours…" : "Soumettre les 4 photos (subsidiaire admin)"}
      </Button>
    </div>
  );
}

type Props = {
  campaigns: MissingCampaign[];
  onRefresh: () => void;
};

export function AdminSubsidiaryUploadPanel({ campaigns, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (campaigns.length === 0) return null;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-amber-600" />
        <p className="font-semibold text-sm">
          Upload subsidiaire administrateur{" "}
          <span className="text-muted-foreground font-normal">(CGU art. 15)</span>
        </p>
        <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Ces campagnes sont approuvées mais n&apos;ont pas encore de photos de pose. En cas
        d&apos;empêchement technique du prestataire, l&apos;administrateur peut soumettre les 4
        angles réglementaires à sa place.
      </p>
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-secondary/20 p-3">
            <button
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div>
                <p className="text-sm font-medium">{c.spot_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {c.company ?? "—"} · {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                </p>
              </div>
              {expanded === c.id ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            {expanded === c.id ? (
              <SubsidiaryUploadForm
                campaign={c}
                onDone={() => {
                  setExpanded(null);
                  onRefresh();
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
