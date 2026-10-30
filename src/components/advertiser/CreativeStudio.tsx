import { useState } from "react";
import { Loader2, Film, Music, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateVideoScript, type VideoScriptResult } from "@/lib/ai/brief-script.functions";
import { cn } from "@/lib/utils";

type Tab = "image" | "audio" | "video";
type AudioMode = "voiceover" | "jingle";

interface Props {
  briefId?: string;
  title: string;
  description: string;
  vehicleTypes: string[];
  adFormat: string | null;
  onAssetAdded: (url: string) => void;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildImagePrompt(
  title: string,
  description: string,
  vehicleTypes: string[],
  adFormat: string | null,
): string {
  const vehicles = vehicleTypes.length ? `(${vehicleTypes.join(", ")})` : "";
  const format = adFormat ? `, format ${adFormat}` : "";
  const desc = description ? ` — ${description.slice(0, 180)}` : "";
  return `Visuel publicitaire urban street style pour "${title || "ma marque"}"${vehicles}${format}${desc}. Photo-réaliste, haute résolution, fond urbain français, typographie moderne.`;
}

function buildAudioPrompt(title: string, description: string, mode: AudioMode): string {
  const type = mode === "voiceover" ? "voice-over publicitaire" : "jingle musical accrocheur";
  const desc = description ? ` ${description.slice(0, 100)}.` : "";
  return `${type} pour la marque "${title || "ma marque"}".${desc} Adapté à une publicité mobile française, ton dynamique et mémorable.`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 animate-pulse", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 bg-primary/15 rounded"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

// ── Image skeleton ────────────────────────────────────────────────────────────

function ImageSkeleton() {
  return (
    <div
      className="w-full rounded-lg border border-border bg-secondary/40 animate-pulse flex items-center justify-center"
      style={{ height: 200 }}
    >
      <Image className="w-8 h-8 text-muted-foreground/30" />
    </div>
  );
}

// ── Audio skeleton ────────────────────────────────────────────────────────────

function AudioSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2 animate-pulse">
      <div className="h-2.5 bg-primary/15 rounded w-1/3" />
      <div className="h-8 bg-primary/10 rounded w-full" />
    </div>
  );
}

// ── Script skeleton ───────────────────────────────────────────────────────────

function ScriptSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-3 animate-pulse">
      <div className="h-2.5 bg-primary/15 rounded w-1/4" />
      <Skeleton lines={4} />
      <div className="h-2.5 bg-primary/10 rounded w-1/2" />
      <div className="space-y-1.5">
        <div className="h-2.5 bg-primary/10 rounded w-full" />
        <div className="h-2.5 bg-primary/10 rounded w-5/6" />
        <div className="h-2.5 bg-primary/10 rounded w-4/6" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CreativeStudio({
  briefId,
  title,
  description,
  vehicleTypes,
  adFormat,
  onAssetAdded,
}: Props) {
  const [tab, setTab] = useState<Tab>("image");
  const [audioMode, setAudioMode] = useState<AudioMode>("jingle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [scriptResult, setScriptResult] = useState<VideoScriptResult | null>(null);
  const [attached, setAttached] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const defaultPrompt =
    tab === "image"
      ? buildImagePrompt(title, description, vehicleTypes, adFormat)
      : buildAudioPrompt(title, description, audioMode);

  const activePrompt = customPrompt || defaultPrompt;

  function switchTab(t: Tab) {
    setTab(t);
    setResultUrl(null);
    setResultPath(null);
    setScriptResult(null);
    setError(null);
    setAttached(false);
    setCustomPrompt("");
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setResultPath(null);
    setScriptResult(null);
    setAttached(false);

    // Video script: pure LLM, no fal.ai
    if (tab === "video") {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) {
          setError("Vous devez être connecté pour générer un script vidéo.");
          setLoading(false);
          return;
        }
        const res = await generateVideoScript({
          data: {
            title: title || "MoveSpot",
            description,
            vehicleTypes,
            adFormat: adFormat ?? undefined,
            _auth: token,
          },
        });
        setScriptResult(res);
        if (!res.ok) setError(res.message);
      } catch {
        setError("Erreur lors de la génération du script.");
      }
      setLoading(false);
      return;
    }

    // Image / Audio: fal.ai via edge function
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setError("Vous devez être connecté pour générer des créatifs.");
      setLoading(false);
      return;
    }

    const { data, error: fnErr } = await supabase.functions.invoke("generate-creative", {
      body: {
        type: tab === "audio" ? audioMode : "image",
        title: title || "MoveSpot",
        description,
        vehicleTypes,
        adFormat: adFormat ?? "covering_total",
        briefId: briefId ?? null,
        prompt: activePrompt,
      },
    });

    if (fnErr || !data?.url) {
      setError(fnErr?.message ?? data?.error ?? "Erreur lors de la génération.");
      setLoading(false);
      return;
    }

    setResultUrl(data.url);
    setResultPath(data.storage_path ?? null);
    setLoading(false);
  }

  function attach() {
    const path = resultPath ?? resultUrl;
    if (path) {
      onAssetAdded(path);
      setAttached(true);
    }
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "image", icon: <Image className="w-3.5 h-3.5" />, label: "Visuel" },
    { id: "audio", icon: <Music className="w-3.5 h-3.5" />, label: "Audio" },
    { id: "video", icon: <Film className="w-3.5 h-3.5" />, label: "Script vidéo" },
  ];

  const generateLabel = {
    image: loading ? "Génération du visuel…" : "Générer le visuel",
    audio: loading
      ? `Génération du ${audioMode === "voiceover" ? "voice-over" : "jingle"}…`
      : `Générer le ${audioMode === "voiceover" ? "voice-over" : "jingle"}`,
    video: loading ? "Génération du script…" : "Générer le script IA",
  }[tab];

  const costLabel = {
    image: "~0,01 €/visuel",
    audio: audioMode === "voiceover" ? "~0,10 €/voice-over" : "~0,10 €/jingle",
    video: "Gratuit · IA text uniquement",
  }[tab];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-sm font-semibold text-primary">Studio créatif IA</p>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-2 py-0.5">
          Beta
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-background/60 rounded-lg p-1 border border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
              tab === t.id
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Audio sub-options */}
      {tab === "audio" && (
        <div className="flex gap-2">
          {(["jingle", "voiceover"] as AudioMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAudioMode(m)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-medium border transition-all",
                audioMode === m
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-background border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "jingle" ? "🎵 Jingle musical" : "🎙 Voice-over"}
            </button>
          ))}
        </div>
      )}

      {/* Custom prompt (image & audio only) */}
      {tab !== "video" && (
        <div>
          <label
            htmlFor="cs-custom-prompt"
            className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block"
          >
            Prompt (optionnel — auto-généré depuis votre brief)
          </label>
          <textarea
            id="cs-custom-prompt"
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={defaultPrompt}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="w-full rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {generateLabel}
          </>
        ) : (
          <>
            <span>✨</span>
            {generateLabel}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      {/* Loading skeletons */}
      {loading && tab === "image" && <ImageSkeleton />}
      {loading && tab === "audio" && <AudioSkeleton />}
      {loading && tab === "video" && <ScriptSkeleton />}

      {/* Image result */}
      {!loading && resultUrl && tab === "image" && !error && (
        <div className="space-y-2">
          <img
            src={resultUrl}
            alt="Visuel généré"
            className="w-full rounded-lg border border-border object-cover max-h-64"
          />
          {attached ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              ✅ Créatif ajouté à votre brief
            </p>
          ) : (
            <button
              type="button"
              onClick={attach}
              className="w-full rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 transition-colors"
            >
              ＋ Ajouter à mon brief
            </button>
          )}
        </div>
      )}

      {/* Audio result */}
      {!loading && resultUrl && tab === "audio" && !error && (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {audioMode === "voiceover" ? "Voice-over généré :" : "Jingle généré :"}
            </p>
            <audio controls className="w-full" src={resultUrl} />
          </div>
          {attached ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              ✅ Audio ajouté à votre brief
            </p>
          ) : (
            <button
              type="button"
              onClick={attach}
              className="w-full rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 transition-colors"
            >
              ＋ Ajouter à mon brief
            </button>
          )}
        </div>
      )}

      {/* Script result */}
      {!loading && scriptResult?.ok && tab === "video" && !error && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Script vidéo</span>
            <span className="ml-auto text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
              {scriptResult.duration}
            </span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Narration
            </p>
            <p className="text-xs text-foreground leading-relaxed">{scriptResult.script}</p>
          </div>

          {scriptResult.scenes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Séquences
              </p>
              <ol className="space-y-1">
                {scriptResult.scenes.map((scene, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-semibold">
                      {i + 1}
                    </span>
                    {scene}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Coût estimé : {costLabel} · Débité sur votre portefeuille MoveSpot
      </p>
    </div>
  );
}
