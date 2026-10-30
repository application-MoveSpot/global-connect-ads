import { useState } from "react";
import { ImageIcon, Loader2, RefreshCw, Maximize2, X, AlertCircle, Sparkles } from "lucide-react";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { generateBriefMockup } from "@/lib/ai/mockup-generator.functions";
import { supabase } from "@/integrations/supabase/client";

const MAX_REGENERATIONS = 3;

type MockupPhase = "prompt" | "loading" | "ready" | "error";

type Props = {
  briefText: string;
  serviceType: string;
  vehicleType?: string;
  briefSessionId?: string;
};

export function MockupPreview({ briefText, serviceType, vehicleType, briefSessionId }: Props) {
  const [phase, setPhase] = useState<MockupPhase>("prompt");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [regenCount, setRegenCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function generate() {
    if (regenCount >= MAX_REGENERATIONS) return;
    setPhase("loading");
    setError("");

    try {
      const session = await getOrRefreshSession();
      const result = await generateBriefMockup({
        data: {
          briefText,
          serviceType,
          vehicleType: vehicleType || undefined,
          briefSessionId,
          _auth: session?.access_token,
        },
      });

      if (!result.ok) {
        setError(result.message);
        setPhase("error");
        return;
      }

      setImageUrl(result.imageUrl);
      setPhase("ready");

      // Persist mockup URL to ai_brief_data row
      if (briefSessionId) {
        await supabase
          .from("ai_brief_data")
          .update({
            mockup_url: result.imageUrl,
            mockup_prompt: result.prompt,
            regeneration_count: regenCount + 1,
          })
          .eq("id", briefSessionId);
      }

      setRegenCount((n) => n + 1);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setPhase("error");
    }
  }

  const canRegen = regenCount < MAX_REGENERATIONS;

  // ── Prompt to generate ───────────────────────────────────────────────────
  if (phase === "prompt") {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4 flex-shrink-0" />
          <span>Générer un aperçu visuel de la campagne</span>
        </div>
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium hover:bg-primary/90 transition flex-shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          Générer
        </button>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="mt-3 space-y-2">
        <div className="rounded-xl overflow-hidden bg-secondary/40 aspect-square w-full max-w-[280px] mx-auto animate-pulse relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Flux Schnell génère votre aperçu…
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-destructive font-medium">Génération échouée</p>
          <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
        </div>
        {canRegen && (
          <button
            type="button"
            onClick={generate}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Réessayer
          </button>
        )}
      </div>
    );
  }

  // ── Ready — image displayed ───────────────────────────────────────────────
  return (
    <>
      <div className="mt-3 rounded-xl overflow-hidden border border-border">
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Aperçu visuel de campagne généré par IA"
            className="w-full object-cover"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute top-2 right-2 rounded-lg bg-black/50 text-white p-1.5 opacity-0 group-hover:opacity-100 transition"
            aria-label="Plein écran"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-card">
          <p className="text-xs text-muted-foreground">
            Aperçu IA · {regenCount}/{MAX_REGENERATIONS} générations
          </p>
          {canRegen && (
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw className="w-3 h-3" />
              Regénérer
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt="Aperçu plein écran"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
