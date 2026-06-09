import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];

export type PortfolioItem = { path: string; url: string; name: string; mime: string };

type Props = {
  value: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
};

export function ProviderPortfolioUploader({ value, onChange }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const refresh = async (items: PortfolioItem[]) => {
    if (items.length === 0) return items;
    const paths = items.map((i) => i.path);
    const { data } = await supabase.storage.from("provider-portfolio").createSignedUrls(paths, 3600);
    if (!data) return items;
    return items.map((it) => {
      const m = data.find((d) => d.path === it.path);
      return m?.signedUrl ? { ...it, url: m.signedUrl } : it;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !userId) return;
    setError(null);
    const remaining = MAX_FILES - value.length;
    if (remaining <= 0) { setError(`Maximum ${MAX_FILES} fichiers.`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const next = [...value];
    for (const f of toUpload) {
      if (!ACCEPTED.includes(f.type)) { setError(`Format non supporté : ${f.name}`); continue; }
      if (f.size > MAX_SIZE) { setError(`Fichier trop volumineux (>50 Mo) : ${f.name}`); continue; }
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("provider-portfolio").upload(path, f, {
        contentType: f.type, upsert: false,
      });
      if (upErr) { setError(upErr.message); continue; }
      const { data: signed } = await supabase.storage.from("provider-portfolio").createSignedUrl(path, 3600);
      next.push({ path, url: signed?.signedUrl ?? "", name: f.name, mime: f.type });
    }
    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (path: string) => {
    await supabase.storage.from("provider-portfolio").remove([path]);
    onChange(value.filter((v) => v.path !== path));
  };

  // refresh signed URLs once on mount in case they expired
  useEffect(() => {
    if (value.length > 0) refresh(value).then((items) => {
      if (items.some((it, i) => it.url !== value[i]?.url)) onChange(items);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || !userId || value.length >= MAX_FILES}
          className="text-sm"
        />
        <span className="text-xs text-muted-foreground">{value.length}/{MAX_FILES}</span>
      </div>
      <p className="text-xs text-muted-foreground">Images (JPG, PNG, WebP, GIF) ou vidéos (MP4, WebM, MOV). 50 Mo max par fichier.</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {value.map((it) => (
            <div key={it.path} className="relative rounded-md border border-border bg-background overflow-hidden">
              {it.mime.startsWith("image/") ? (
                <img src={it.url} alt={it.name} className="w-full h-28 object-cover" />
              ) : (
                <video src={it.url} className="w-full h-28 object-cover bg-black" muted playsInline />
              )}
              <button
                type="button"
                onClick={() => remove(it.path)}
                className="absolute top-1 right-1 bg-background/90 text-destructive text-xs rounded-full px-2 py-0.5 border border-border hover:bg-destructive hover:text-destructive-foreground"
              >
                ✕
              </button>
              <div className="truncate text-[10px] px-1.5 py-1 text-muted-foreground">{it.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
