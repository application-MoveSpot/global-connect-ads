import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, X, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VehicleType = "taxi" | "van" | "scooter" | "food_truck";

type AiBriefPreview = {
  title: string;
  description: string;
  duration_weeks: number;
  city: string;
  budget: number;
  vehicle_type: VehicleType;
  audience: string;
};

interface AiBriefModalProps {
  onClose: () => void;
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  taxi: "Taxi",
  van: "Van",
  scooter: "Scooter",
  food_truck: "Food truck",
};

const PLACEHOLDER_EXAMPLES = [
  "Je veux lancer une campagne de 3 semaines à Paris pour mon restaurant de burgers avec un budget de 2 000 €.",
  "Campagne de notoriété pour mon app mobile à Lyon, 1 mois, 3 500 €, cible jeunes actifs.",
  "Promotionner mon magasin de chaussures à Bordeaux pour les fêtes, 2 semaines, 1 500 €.",
];

export function AiBriefModal({ onClose }: AiBriefModalProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AiBriefPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const { data, error: fnError } = await supabase.functions.invoke("ai-brief-prefill", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { prompt: prompt.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      setPreview(data as AiBriefPreview);
    } catch {
      setError("Impossible de générer le brief. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + preview.duration_weeks * 7);

    try {
      localStorage.setItem(
        "movespot_brief_draft_v1",
        JSON.stringify({
          title: preview.title,
          description: preview.description,
          budget: String(preview.budget),
          euCity: preview.city,
          audience: preview.audience,
          vehicleTypes: [preview.vehicle_type],
          startDate: today.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        }),
      );
    } catch {
      /* localStorage unavailable */
    }
    void navigate({ to: "/advertiser/briefs/nouveau" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Créer un brief avec l'IA</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition rounded-full p-1"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input phase */}
        {!preview && (
          <>
            <p className="text-sm text-muted-foreground">
              Décrivez votre campagne en langage naturel. L'IA extrait les détails clés et
              pré-remplit le formulaire de brief.
            </p>
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-border bg-secondary/30 p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder={PLACEHOLDER_EXAMPLES[0]}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">⌘↵ pour générer</p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              onClick={() => void handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Analyse en cours…" : "Générer mon brief"}
            </button>
          </>
        )}

        {/* Preview phase */}
        {preview && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3 text-sm">
              <div className="font-semibold text-base">{preview.title}</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Ville</span>
                  <div className="font-medium mt-0.5">{preview.city}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Durée</span>
                  <div className="font-medium mt-0.5">
                    {preview.duration_weeks} semaine{preview.duration_weeks > 1 ? "s" : ""}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget</span>
                  <div className="font-medium mt-0.5">
                    {preview.budget.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Véhicule</span>
                  <div className="font-medium mt-0.5">
                    {VEHICLE_LABELS[preview.vehicle_type] ?? preview.vehicle_type}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Audience</span>
                  <div className="font-medium mt-0.5">{preview.audience}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                {preview.description}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Modifier
              </button>
              <button
                onClick={handleApply}
                className="flex-1 rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 transition"
              >
                Utiliser ce brief →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
