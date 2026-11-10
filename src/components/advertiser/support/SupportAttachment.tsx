import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SupportAttachmentProps {
  path: string;
  type: string;
  name?: string;
}

export function SupportAttachment({ path, type, name }: SupportAttachmentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;

    async function fetchSignedUrl() {
      try {
        const { data, error } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(path, 3600); // 1 h — cohérent avec uploadAttachment.ts
        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Erreur pièce jointe :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSignedUrl();
  }, [path]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse mt-2">
        Chargement du fichier…
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="text-xs text-destructive mt-2">
        Impossible de charger la pièce jointe
      </div>
    );
  }

  if (type.startsWith("image/")) {
    return (
      <div className="mt-2 max-w-xs rounded-lg border border-border shadow-sm overflow-hidden">
        <img
          src={signedUrl}
          alt={name ?? "Pièce jointe"}
          className="w-full h-auto object-contain max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(signedUrl, "_blank")}
        />
      </div>
    );
  }

  if (type === "application/pdf") {
    return (
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm font-medium"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span>{name ?? "Voir le document PDF"}</span>
      </a>
    );
  }

  return (
    <a
      href={signedUrl}
      download={name}
      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm font-medium"
    >
      <Download className="h-4 w-4 shrink-0" />
      <span>{name ?? "Télécharger le fichier"}</span>
    </a>
  );
}
