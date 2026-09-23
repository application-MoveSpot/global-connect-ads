import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

const supportedLanguages = ["fr", "en"] as const;

function getInitialLanguage() {
  if (typeof window === "undefined") return "fr";

  try {
    const stored = window.localStorage.getItem("movespot_lang");
    if (supportedLanguages.includes(stored as (typeof supportedLanguages)[number])) {
      return stored;
    }
  } catch {
    // localStorage can be unavailable in private browsing or strict privacy modes.
  }

  return "fr";
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  supportedLngs: [...supportedLanguages],
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
