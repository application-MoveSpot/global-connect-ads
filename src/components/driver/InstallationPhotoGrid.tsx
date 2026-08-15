import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INSTALLATION_VIEWS, INSTALLATION_VIEW_LABEL, type InstallationView } from "@/lib/providers/installation.functions";

export type InstallationPhotos = Partial<Record<InstallationView, string>> & { submitted_at?: string };

export function parseInstallationPhotos(value: unknown): InstallationPhotos | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const out: InstallationPhotos = {};
  for (const v of INSTALLATION_VIEWS) {
    if (typeof obj[v] === "string") out[v] = obj[v] as string;
  }
  if (typeof obj["submitted_at"] === "string") out.submitted_at = obj["submitted_at"] as string;
  return Object.keys(out).length ? out : null;
}

/** Grille des 4 vues de pose avec URLs signées (bucket privé). */
export function InstallationPhotoGrid({ photos }: { photos: InstallationPhotos | null }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const paths = INSTALLATION_VIEWS.map((v) => photos?.[v]).filter((p): p is string => Boolean(p));

  useEffect(() => {
    if (paths.length === 0) { setUrls({}); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.storage.from("campaign-creatives").createSignedUrls(paths, 3600);
      if (!alive || !data) return;
      const map: Record<string, string> = {};
      for (const d of data) {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      }
      setUrls(map);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join("|")]);

  if (paths.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        Aucune photo de pose transmise pour l'instant.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {INSTALLATION_VIEWS.map((view) => {
        const path = photos?.[view];
        const url = path ? urls[path] : undefined;
        return (
          <div key={view} className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="border-b border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {INSTALLATION_VIEW_LABEL[view]}
            </div>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Pose covering — ${INSTALLATION_VIEW_LABEL[view]}`}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              </a>
            ) : (
              <div className="flex h-36 items-center justify-center text-[11px] text-muted-foreground">
                {path ? "Chargement…" : "Manquante"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
