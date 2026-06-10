import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifySiret } from "@/lib/siret.functions";

export type SiretCheck = {
  siret: string;
  denomination: string | null;
  verified: boolean;
  isIndividual?: boolean;
};

export function SiretField({
  value,
  onChange,
  required = true,
}: {
  value: SiretCheck;
  onChange: (v: SiretCheck) => void;
  required?: boolean;
}) {
  const verify = useServerFn(verifySiret);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = value.siret.replace(/\s/g, "");

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ data: { siret: cleaned } });
      if (res.ok) {
        onChange({ siret: cleaned, denomination: res.denomination, verified: true });
      } else {
        onChange({ siret: cleaned, denomination: null, verified: false });
        setError(res.error);
      }
    } catch (e) {
      setError("Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        SIRET {required && "*"}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={value.siret}
          onChange={(e) => {
            const s = e.target.value.replace(/[^\d\s]/g, "");
            onChange({ siret: s, denomination: null, verified: false });
            setError(null);
          }}
          placeholder="14 chiffres"
          className="flex-1 rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || cleaned.length !== 14 || value.verified}
          className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : value.verified ? "✓ Vérifié" : "Vérifier"}
        </button>
      </div>
      {value.verified && value.denomination && (
        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          ✓ {value.denomination}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
      {!value.verified && !error && cleaned.length > 0 && cleaned.length !== 14 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {cleaned.length}/14 chiffres
        </p>
      )}
    </div>
  );
}
