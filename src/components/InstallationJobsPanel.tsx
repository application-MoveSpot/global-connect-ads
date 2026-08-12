import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listInstallationJobs } from "@/lib/installation.functions";
import { InstallationPhotosPanel } from "@/components/InstallationPhotosPanel";

type Job = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  company: string;
  start_date: string | null;
  end_date: string | null;
  installation_photos: unknown;
  installation_status: string | null;
  installation_notes: string | null;
};

const fr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function InstallationJobsPanel() {
  const fetchJobs = useServerFn(listInstallationJobs);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [isInstaller, setIsInstaller] = useState(false);

  const load = useCallback(() => {
    fetchJobs()
      .then((r) => {
        setIsInstaller(r.isInstaller);
        setJobs((r.jobs ?? []) as Job[]);
      })
      .catch(() => setJobs([]));
  }, [fetchJobs]);

  useEffect(() => {
    load();
  }, [load]);

  if (jobs === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Chargement des poses à valider…
      </div>
    );
  }

  if (!isInstaller) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Validation des poses</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La transmission des photos de pose est réservée aux poseurs certifiés MoveSpot. Dès votre certification
          validée, les campagnes à équiper apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold">Poses à réaliser et à transmettre</h3>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Après la pose du covering, photographiez les quatre vues du véhicule (face avant, côté gauche, côté droit,
        face arrière) et transmettez-les. MoveSpot approuve ou refuse la pose ; la diffusion et la rémunération ne
        démarrent qu'après validation.
      </p>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune pose en attente pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-border p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{job.spot_name}</p>
                <p className="text-xs text-muted-foreground">
                  {job.company} · {fr(job.start_date)} → {fr(job.end_date)}
                </p>
              </div>
              {job.spot_location ? (
                <p className="mb-2 text-xs text-muted-foreground">Zone : {job.spot_location}</p>
              ) : null}
              <InstallationPhotosPanel
                campaignRequestId={job.id}
                installationPhotos={job.installation_photos}
                installationStatus={job.installation_status}
                installationNotes={job.installation_notes}
                onSubmitted={load}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
