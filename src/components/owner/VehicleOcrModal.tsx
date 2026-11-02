import { useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { X, Upload, ScanLine, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractVehicleFromImage, type VehicleOcrResult } from "@/lib/ai/vehicle-ocr.functions";

type Props = {
  onClose: () => void;
};

type Step = "idle" | "uploading" | "analyzing" | "done" | "error";

const ENERGIE_LABELS: Record<string, string> = {
  ESSENCE: "Essence",
  DIESEL: "Diesel",
  ELECTRIQUE: "Électrique",
  HYBRIDE: "Hybride",
  GPL: "GPL",
};

export function VehicleOcrModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VehicleOcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const callOcr = useServerFn(extractVehicleFromImage);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setErrorMsg("Format non supporté. Utilisez JPG, PNG ou PDF.");
        setStep("error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Image trop lourde (max 10 Mo).");
        setStep("error");
        return;
      }

      setStep("uploading");
      setErrorMsg(null);

      // Convert to base64 data URL, resize to max 1024px for efficiency
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const MAX = 1024;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = reject;
          img.src = e.target!.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPreview(dataUrl);
      setStep("analyzing");

      try {
        const ocr = await callOcr({ data: { imageDataUrl: dataUrl } });
        setResult(ocr);
        setStep("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Erreur d'analyse. Réessayez.");
        setStep("error");
      }
    },
    [callOcr],
  );

  const handleFiles = (files: FileList | null) => {
    if (files?.[0]) void processFile(files[0]);
  };

  const buildSearchParams = () => {
    if (!result) return {};
    const p: Record<string, string> = {};
    if (result.marque) p.marque = result.marque;
    if (result.modele) p.modele = result.modele;
    if (result.immatriculation) p.immatriculation = result.immatriculation;
    if (result.dateCirculation) p.dateCirculation = result.dateCirculation;
    if (result.energie) p.energie = result.energie;
    return p;
  };

  const filledCount = result
    ? [
        result.marque,
        result.modele,
        result.immatriculation,
        result.dateCirculation,
        result.energie,
      ].filter(Boolean).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold leading-tight">
                Scanner une carte grise
              </h2>
              <p className="text-xs text-muted-foreground">Extraction automatique par IA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          {(step === "idle" || step === "error") && (
            <>
              <div
                className={cn(
                  "relative rounded-xl border-2 border-dashed transition-all cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                      dragOver
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {dragOver ? "Déposez ici" : "Glissez la carte grise ou cliquez"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · Max 10 Mo</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    Certificat d'immatriculation · Carte grise ancienne format · Photo véhicule
                  </p>
                </div>
              </div>

              {step === "error" && errorMsg && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </>
          )}

          {/* Analyzing state */}
          {(step === "uploading" || step === "analyzing") && (
            <div className="space-y-4">
              {preview && (
                <div className="relative rounded-xl overflow-hidden h-40 bg-secondary/30">
                  <img src={preview} alt="Document" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 text-white text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {step === "uploading"
                      ? "Traitement de l'image…"
                      : "Analyse de la carte grise par l'IA…"}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {["Lecture du document", "Extraction des données", "Validation des champs"].map(
                  (label, i) => {
                    const done = step === "analyzing" ? i < 2 : i < 1;
                    return (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                            done
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <span className={done ? "text-foreground" : "text-muted-foreground"}>
                          {label}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Confidence badge */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                  result.confidence === "high"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : result.confidence === "medium"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                      : "bg-secondary text-muted-foreground border border-border",
                )}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                {result.confidence === "high"
                  ? `Extraction réussie — ${filledCount}/5 champs détectés`
                  : result.confidence === "medium"
                    ? `Extraction partielle — ${filledCount}/5 champs détectés. Vérifiez avant validation.`
                    : "Lecture difficile — vérifiez et complétez les champs manuellement."}
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Marque", value: result.marque },
                  { label: "Modèle", value: result.modele },
                  { label: "Immatriculation", value: result.immatriculation },
                  { label: "1ère mise en circulation", value: result.dateCirculation },
                  {
                    label: "Énergie",
                    value: result.energie
                      ? (ENERGIE_LABELS[result.energie] ?? result.energie)
                      : null,
                  },
                  { label: "VIN / N° série", value: result.vin },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      value ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/20",
                    )}
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {label}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        value ? "text-foreground" : "text-muted-foreground/50",
                      )}
                    >
                      {value ?? "—"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Retry link */}
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setResult(null);
                  setPreview(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Scanner un autre document
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            Annuler
          </button>
          {step === "done" && result ? (
            <Link
              to="/owner/vehicules/nouveau"
              search={buildSearchParams()}
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              Pré-remplir le formulaire →
            </Link>
          ) : (
            <Link
              to="/owner/vehicules/nouveau"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition"
            >
              Saisir manuellement
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
