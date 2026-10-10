import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { verifySiret } from "@/lib/providers/siret.functions";
import { validateSiretLuhn, formatSiretDisplay } from "@/lib/siret";

export type SiretCheck = {
  siret: string;
  denomination: string | null;
  verified: boolean;
  isIndividual?: boolean;
  address?: string | null;
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
  const { t } = useTranslation();
  const verify = useServerFn(verifySiret);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  const cleaned = value.siret.replace(/\s/g, "");
  const luhnOk = cleaned.length === 14 && validateSiretLuhn(cleaned);

  const handleVerify = async () => {
    if (cleaned.length !== 14) return;
    if (!luhnOk) {
      setError(t("siret.err_luhn"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ data: { siret: cleaned } });
      if (res.ok) {
        onChange({
          siret: cleaned,
          denomination: res.denomination,
          verified: true,
          isIndividual: res.isIndividual,
          address: res.adresse ?? null,
        });
      } else {
        onChange({ siret: cleaned, denomination: null, verified: false });
        setError(res.error);
      }
    } catch {
      setError(t("siret.err_verify"));
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify once when 14 valid digits are entered
  useEffect(() => {
    if (luhnOk && !value.verified && !loading && !autoTriggered.current) {
      autoTriggered.current = true;
      const timer = setTimeout(handleVerify, 400);
      return () => clearTimeout(timer);
    }
    if (!luhnOk) autoTriggered.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luhnOk, value.verified]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    const formatted = formatSiretDisplay(digits);
    onChange({ siret: formatted, denomination: null, verified: false, address: null });
    setError(null);
    autoTriggered.current = false;
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        SIRET {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={value.siret}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t("siret.placeholder")}
          className="flex-1 rounded-lg bg-input border border-border px-4 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-ring"
          aria-describedby={error ? "siret-error" : undefined}
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || cleaned.length !== 14 || value.verified}
          className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "..." : value.verified ? t("siret.btn_verified") : t("siret.btn_verify")}
        </button>
      </div>

      {/* Success */}
      {value.verified && value.denomination && (
        <div className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 space-y-0.5">
          <p>✓ {value.denomination}{value.isIndividual && ` ${t("siret.individual_note")}`}</p>
          {value.address && <p className="text-muted-foreground">{value.address}</p>}
        </div>
      )}

      {/* Luhn or API error */}
      {error && (
        <p id="siret-error" className="mt-1.5 text-xs text-destructive">{error}</p>
      )}

      {/* Digit counter (only while typing, before reaching 14) */}
      {!value.verified && !error && cleaned.length > 0 && cleaned.length < 14 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("siret.digit_count", { count: cleaned.length })}
        </p>
      )}

      {/* Client-side Luhn warning (14 digits entered but invalid) */}
      {!value.verified && !error && cleaned.length === 14 && !luhnOk && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          {t("siret.err_luhn")}
        </p>
      )}
    </div>
  );
}
