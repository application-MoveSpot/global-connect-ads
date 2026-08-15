import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type VerifyResult =
  | { ok: true; url: string; https: boolean; status: number; title: string | null; warnings: string[] }
  | { ok: false; error: string };

const SUSPICIOUS_TLDS = [".zip", ".mov", ".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq"];
const SUSPICIOUS_KEYWORDS = ["login-", "secure-", "verify-", "account-update", "free-money", "bitcoin-gift"];

export const verifyWebsite = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) =>
    z.object({ url: z.string().min(4).max(300) }).parse(d),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    let url: URL;
    try {
      url = new URL(data.url.trim());
    } catch {
      return { ok: false, error: "URL invalide. Utilisez le format https://votre-entreprise.fr" };
    }
    if (url.protocol !== "https:") {
      return { ok: false, error: "Le site doit être en HTTPS (https://...) — un site non sécurisé n'est pas accepté." };
    }
    const host = url.hostname.toLowerCase();
    const warnings: string[] = [];
    if (SUSPICIOUS_TLDS.some((t) => host.endsWith(t))) {
      warnings.push(`Extension de domaine ${host.slice(host.lastIndexOf("."))} souvent associée à des sites frauduleux.`);
    }
    if (SUSPICIOUS_KEYWORDS.some((k) => host.includes(k) || url.pathname.includes(k))) {
      warnings.push("Le domaine contient des mots souvent utilisés dans des sites d'hameçonnage.");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      warnings.push("Le site est servi depuis une adresse IP brute (suspect).");
    }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "MoveSpotBot/1.0 (+verification)" },
      });
      clearTimeout(t);
      if (!res.ok) {
        return { ok: false, error: `Le site répond avec une erreur ${res.status}. Vérifiez l'URL.` };
      }
      const html = (await res.text()).slice(0, 50000);
      const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;
      if (/phishing|malware|suspended|under construction|coming soon|parked domain/i.test(html)) {
        warnings.push("Contenu suspect détecté sur la page (parking, hameçonnage ou site inactif).");
      }
      return { ok: true, url: url.toString(), https: true, status: res.status, title, warnings };
    } catch (err: any) {
      return { ok: false, error: `Site inaccessible (${err?.name === "AbortError" ? "délai dépassé" : "réseau"}). Vérifiez l'URL.` };
    }
  });
