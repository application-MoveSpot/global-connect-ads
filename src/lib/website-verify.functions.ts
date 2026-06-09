import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string().trim().min(4).max(500),
});

export type WebsiteCheck = {
  ok: boolean;
  https: boolean;
  reachable: boolean;
  status?: number;
  finalUrl?: string;
  isHtml?: boolean;
  reason?: string;
};

export const verifyWebsite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<WebsiteCheck> => {
    let raw = data.url.trim();
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    let parsed: URL;
    try { parsed = new URL(raw); }
    catch { return { ok: false, https: false, reachable: false, reason: "URL invalide." }; }

    const https = parsed.protocol === "https:";
    if (!https) {
      return { ok: false, https: false, reachable: false, reason: "Site non sécurisé (HTTP). Seuls les sites HTTPS sont acceptés." };
    }

    // Forbid IPs and localhost-style hosts
    const host = parsed.hostname.toLowerCase();
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === "localhost" || host.endsWith(".local")) {
      return { ok: false, https: true, reachable: false, reason: "Domaine non public non autorisé." };
    }
    // Must have a TLD
    if (!host.includes(".") || host.split(".").pop()!.length < 2) {
      return { ok: false, https: true, reachable: false, reason: "Nom de domaine invalide." };
    }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const resp = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": "MoveSpotBot/1.0 (+verification)" },
      });
      clearTimeout(t);
      const ct = (resp.headers.get("content-type") ?? "").toLowerCase();
      const isHtml = ct.includes("text/html") || ct.includes("application/xhtml");
      if (!resp.ok) {
        return { ok: false, https: true, reachable: false, status: resp.status, finalUrl: resp.url,
          reason: `Le site répond avec le code ${resp.status}.` };
      }
      if (!isHtml) {
        return { ok: false, https: true, reachable: true, status: resp.status, finalUrl: resp.url, isHtml: false,
          reason: "Le site ne renvoie pas une page web standard." };
      }
      const finalUrl = new URL(resp.url);
      if (finalUrl.protocol !== "https:") {
        return { ok: false, https: false, reachable: true, status: resp.status, finalUrl: resp.url,
          reason: "Le site redirige vers une page non sécurisée (HTTP)." };
      }
      return { ok: true, https: true, reachable: true, status: resp.status, finalUrl: resp.url, isHtml: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "inconnue";
      return { ok: false, https: true, reachable: false, reason: `Site injoignable (${msg}).` };
    }
  });
