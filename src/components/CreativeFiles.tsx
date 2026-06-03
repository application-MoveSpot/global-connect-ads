import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = { paths: string[] | null | undefined };

type SignedFile = { path: string; url: string; name: string; isImage: boolean; isVideo: boolean };

export function CreativeFiles({ paths }: Props) {
  const [files, setFiles] = useState<SignedFile[]>([]);

  useEffect(() => {
    if (!paths || paths.length === 0) { setFiles([]); return; }
    (async () => {
      const { data } = await supabase.storage
        .from("campaign-creatives")
        .createSignedUrls(paths, 3600);
      if (!data) return;
      setFiles(
        data
          .filter((d) => d.signedUrl)
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
          <a
            key={f.path}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-border bg-background overflow-hidden hover:border-primary transition"
            title={f.name}
          >
            {f.isImage ? (
              <img src={f.url} alt={f.name} className="w-full h-24 object-cover" />
            ) : f.isVideo ? (
              <video src={f.url} className="w-full h-24 object-cover" muted />
            ) : (
              <div className="w-full h-24 flex items-center justify-center text-2xl">📄</div>
            )}
            <div className="px-2 py-1 truncate text-[10px] text-muted-foreground">{f.name}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
