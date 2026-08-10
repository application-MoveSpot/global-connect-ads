import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Viewer360 } from "@/components/Viewer360";

type Props = { paths: string[] | null | undefined };

type SignedFile = { path: string; url: string; name: string; isImage: boolean; isVideo: boolean };

export function CreativeFiles({ paths }: Props) {
  const [files, setFiles] = useState<SignedFile[]>([]);
  const [view360, setView360] = useState<SignedFile | null>(null);


  useEffect(() => {
    if (!paths || paths.length === 0) { setFiles([]); return; }
    (async () => {
      const { data } = await supabase.storage
        .from("campaign-creatives")
        .createSignedUrls(paths, 3600);
      if (!data) return;
      setFiles(
        data
          .filter((d): d is typeof d & { signedUrl: string } => Boolean(d.signedUrl))
          .map((d) => {
            const path = d.path ?? "";
            const name = path.split("/").pop() ?? path;
            const ext = name.split(".").pop()?.toLowerCase() ?? "";
            return {
              path,
              url: d.signedUrl,
              name,
              isImage: ["jpg", "jpeg", "png", "webp", "gif"].includes(ext),
              isVideo: ["mp4", "mov", "webm"].includes(ext),
            };
          })
      );
    })();
  }, [paths?.join("|")]);

  if (!paths || paths.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs mb-4 space-y-2">
      <div className="font-semibold text-foreground">🎨 Créa fournie ({paths.length})</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {files.map((f) => (
          <div
            key={f.path}
            className="rounded-md border border-border bg-background overflow-hidden hover:border-primary transition"
            title={f.name}
          >
            {f.isImage ? (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={f.url} alt={f.name} className="w-full h-32 object-cover" loading="lazy" />
              </a>
            ) : f.isVideo ? (
              <video
                src={f.url}
                className="w-full h-32 object-cover bg-black"
                controls
                preload="metadata"
                playsInline
                muted
              />
            ) : (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="block w-full h-32 flex items-center justify-center text-2xl">📄</a>
            )}
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="truncate text-[10px] text-muted-foreground">{f.name}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline shrink-0">Ouvrir</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
