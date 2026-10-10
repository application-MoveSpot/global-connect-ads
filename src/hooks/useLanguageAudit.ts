import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { scanPageForLanguageIssues } from "@/lib/i18n/language-audit";
import { reportTranslationIssues } from "@/lib/i18n/translation-issue.functions";

const SESSION_KEY = "movespot_lang_audit";

function getAuditedRoutes(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markRouteAudited(route: string) {
  try {
    const routes = getAuditedRoutes();
    routes.add(route);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...routes]));
  } catch {
    /* sessionStorage unavailable */
  }
}

// Scan once per route per session, 1 s after mount (DOM fully rendered).
export function useLanguageAudit() {
  const location = useLocation();
  const route = location.pathname;
  const doReport = useServerFn(reportTranslationIssues);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip if already audited this route in this session
    if (getAuditedRoutes().has(route)) return;

    timerRef.current = setTimeout(async () => {
      const issues = scanPageForLanguageIssues();
      if (issues.length === 0) {
        markRouteAudited(route);
        return;
      }

      try {
        await doReport({
          data: {
            issues: issues.map((i) => ({
              route,
              textSnippet: i.textSnippet,
              elementPath: i.elementPath,
              detectedLang: i.detectedLang,
              expectedLang: i.expectedLang,
            })),
          },
        });
      } catch {
        // Non-critical: detection runs silently
      } finally {
        markRouteAudited(route);
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [route, doReport]);
}
