import { useTranslation } from "react-i18next";
import { getCurrencyFromLang, CURRENCY_CONFIGS } from "@/lib/currency";

const LANGS = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const activeLang = i18n.resolvedLanguage ?? "fr";
  const activeCurrency = getCurrencyFromLang(activeLang);
  const { symbol } = CURRENCY_CONFIGS[activeCurrency];

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {LANGS.map(({ code, label, flag }) => (
        <button
          key={code}
          type="button"
          aria-label={`Switch to ${label}`}
          onClick={() => {
            try {
              localStorage.setItem("movespot_lang", code);
            } catch {}
            i18n.changeLanguage(code);
          }}
          className={`text-xs font-semibold px-2 py-1 rounded-md transition ${
            activeLang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
      <span
        className="text-xs text-muted-foreground font-mono pl-1 select-none"
        title={activeCurrency}
      >
        {symbol}
      </span>
    </div>
  );
}
