import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPTED_LABEL = "PDF, JPG, PNG – max 10 Mo";

export type DocUploadState = { path: string } | null;

type Props = {
  label: string;
  hint?: string;
  required?: boolean;
  docType: string;
  userId: string;
  value: DocUploadState;
  onChange: (v: DocUploadState) => void;
};

export function ProviderDocUpload({ label, hint, required, docType, userId, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Format non accepté. Utilisez PDF, JPG ou PNG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/${docType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("provider-documents")
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    onChange({ path });
  };

  const remove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-destructive text-xs">*</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1 truncate text-emerald-800 dark:text-emerald-200">
            {value.path.split("/").pop()}
          </span>
          <button
            type="button"
            onClick={remove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Supprimer"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 w-full rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground hover:bg-secondary/60 disabled:opacity-50 transition"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Envoi en cours…" : `Choisir un fichier — ${ACCEPTED_LABEL}`}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
