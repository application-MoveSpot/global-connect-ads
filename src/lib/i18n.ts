import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "fr",
  supportedLngs: ["fr", "en"],
  interpolation: { escapeValue: false },
  initAsync: false,
});

if (typeof window !== "undefined") {
  const stored = localStorage.getItem("movespot_lang");
  if (stored === "fr" || stored === "en") {
    i18n.changeLanguage(stored);
  }
}

export default i18n;
