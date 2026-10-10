import { useLanguageAudit } from "@/hooks/useLanguageAudit";

/** Détecte silencieusement les textes anglais sur chaque page et les remonte à l'admin. */
export function LanguageAuditGuard() {
  useLanguageAudit();
  return null;
}
