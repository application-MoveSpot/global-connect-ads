import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";
import ar from "../locales/ar.json";

export const SUPPORTED_LANGS = ["fr", "en", "ar"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function getInitialLanguage(): SupportedLang {
  if (typeof window === "undefined") return "fr";
  try {
    const stored = localStorage.getItem("movespot_lang");
    if (stored === "fr" || stored === "en" || stored === "ar") return stored;
  } catch {}
  return "fr";
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  supportedLngs: [...SUPPORTED_LANGS],
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});

if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("movespot_lang");
    if (stored && SUPPORTED_LANGS.includes(stored as SupportedLang)) {
      i18n.changeLanguage(stored);
    }
  } catch {}
  // Apply RTL when Arabic
  i18n.on("languageChanged", (lng) => {
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  });
  // Initial apply
  const current = i18n.language;
  document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = current;
}

export default i18n;
