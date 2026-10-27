import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "image" | "jingle" | "video";

interface Props {
  briefId?: string;
  title: string;
  description: string;
  vehicleTypes: string[];
  adFormat: string | null;
  onAssetAdded: (url: string) => void;
}

export function CreativeStudio({ briefId, title, description, vehicleTypes, adFormat, onAssetAdded }: Props) {
  const [tab, setTab] = useState<Tab>("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [attached, setAttached] = useState(false);

  const defaultPrompt = tab === "image"
    ? `Visuel publicitaire pour "${title || "ma marque"}". ${description ? description.slice(0, 150) + "." : ""}`
    : `Jingle publicitaire pour "${title || "ma marque"}". ${description ? description.slice(0, 100) + "." : ""}`;

  const activePrompt = prompt || defaultPrompt;

  async function generate() {
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setAttached(false);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setError("Vous devez être connecté pour générer des créatifs.");
      setLoading(false);
      return;
    }

    const { data, error: fnErr } = await supabase.functions.invoke("generate-creative", {
      body: {
        type: tab,
        title: title || "MoveSpot",
        description,
        vehicleTypes,
        adFormat: adFormat ?? "covering_total",
        briefId: briefId ?? null,
        prompt: prompt || undefined,
      },
    });

    if (fnErr || !data?.url) {
      setError(fnErr?.message ?? data?.error ?? "Erreur lors de la génération.");
      setLoading(false);
      return;
    }

    setResultUrl(data.url);
    setLoading(false);
  }

  function attach() {
    if (resultUrl) {
      onAssetAdded(resultUrl);
      setAttached(true);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "image", label: "🖼 Visuel" },
    { id: "jingle", label: "🎵 Jingle" },
    { id: "video", label: "🎬 Vidéo" },
  ];

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          Studio créatif IA
        </p>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-violet-500 border border-violet-400/40 rounded-full px-2 py-0.5">
          Beta
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-background/60 rounded-lg p-1 border border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.id === "video"}
            onClick={() => {
              setTab(t.id);
              setResultUrl(null);
              setError(null);
              setAttached(false);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${tab === t.id
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t.label}
            {t.id === "video" && (
              <span className="ml-1 text-[9px] bg-border text-muted-foreground rounded px-1">Bientôt</span>
            )}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
          Prompt (optionnel — auto-généré depuis votre brief)
        </label>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={defaultPrompt}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40"
        />
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={generate}
        disabled={loading || tab === "video"}
        className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {tab === "image" ? "Génération du visuel…" : "Génération du jingle…"}
          </>
        ) : (
          <>
            <span>✨</span>
            {tab === "image" ? "Générer le visuel" : "Générer le jingle"}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      {/* Result */}
      {resultUrl && !error && (
        <div className="space-y-2">
          {tab === "image" ? (
            <img
              src={resultUrl}
              alt="Visuel généré"
              className="w-full rounded-lg border border-border object-cover max-h-64"
            />
          ) : (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-2">Jingle généré :</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls className="w-full" src={resultUrl} />
            </div>
          )}

          {attached ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              ✅ Créatif ajouté à votre brief
            </p>
          ) : (
            <button
              type="button"
              onClick={attach}
              className="w-full rounded-lg border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-medium py-2 transition-colors"
            >
              ＋ Ajouter à mon brief
            </button>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Coût estimé : {tab === "image" ? "~0,01 €/visuel" : "~0,10 €/jingle"} · Débité sur votre portefeuille MoveSpot
      </p>
    </div>
  );
}
