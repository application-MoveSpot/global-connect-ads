/**
 * scripts/generate-sitemap.js
 *
 * Génère public/sitemap.xml avec les entrées STATIQUES uniquement.
 * Exécuté automatiquement après le build via "postbuild" dans package.json.
 *
 * Architecture : deux couches complémentaires.
 *   1. Ce script  → public/sitemap.xml (statique, build-time, sans accès DB)
 *      Servi par Cloudflare CDN comme fallback statique.
 *   2. src/routes/sitemap[.]xml.ts → route SSR dynamique (runtime, avec entrées DB)
 *      Le handler SSR de TanStack Start intercepte /sitemap.xml AVANT les assets
 *      statiques, donc le fichier dynamique est toujours servi en production.
 *      Le public/sitemap.xml agit comme snapshot de secours (outils d'audit SEO,
 *      tests CI, déploiements sans Worker actif).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://move-spot.com";
const today = new Date().toISOString().slice(0, 10);

/** @typedef {{ path: string, lastmod?: string, changefreq?: string, priority?: string }} Entry */

/** @type {Entry[]} */
const staticEntries = [
  // ── Core ──────────────────────────────────────────────────────────────────
  { path: "/",                    changefreq: "daily",   priority: "1.0", lastmod: today },
  // ── Annonceurs ────────────────────────────────────────────────────────────
  { path: "/pourquoi-movespot",   changefreq: "monthly", priority: "0.9", lastmod: today },
  { path: "/comment-ca-marche",   changefreq: "monthly", priority: "0.9", lastmod: today },
  { path: "/tarifs",              changefreq: "monthly", priority: "0.9", lastmod: today },
  { path: "/annonceurs-entreprise", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/commencer",           changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/campagnes",           changefreq: "weekly",  priority: "0.7", lastmod: today },
  // ── Propriétaires ─────────────────────────────────────────────────────────
  { path: "/devenir-partenaire",  changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/driver/inscription",  changefreq: "monthly", priority: "0.6", lastmod: today },
  // ── Prestataires (répertoire public) ──────────────────────────────────────
  { path: "/providers",           changefreq: "weekly",  priority: "0.7", lastmod: today },
  // ── Contact & support ─────────────────────────────────────────────────────
  { path: "/contact",             changefreq: "yearly",  priority: "0.5", lastmod: today },
  { path: "/securite",            changefreq: "yearly",  priority: "0.4", lastmod: today },
  { path: "/remboursement",       changefreq: "yearly",  priority: "0.3", lastmod: today },
  // ── Légal ─────────────────────────────────────────────────────────────────
  { path: "/mentions-legales",    changefreq: "yearly",  priority: "0.3", lastmod: today },
  { path: "/cgu",                 changefreq: "yearly",  priority: "0.3", lastmod: today },
  { path: "/cgv",                 changefreq: "yearly",  priority: "0.3", lastmod: today },
  { path: "/confidentialite",     changefreq: "yearly",  priority: "0.3", lastmod: today },
  { path: "/cookies",             changefreq: "yearly",  priority: "0.3", lastmod: today },
];

function buildXml(entries) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod    ? `    <lastmod>${e.lastmod}</lastmod>`       : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority   ? `    <priority>${e.priority}</priority>`   : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

const outPath = join(__dirname, "..", "public", "sitemap.xml");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buildXml(staticEntries), "utf8");

console.log(`✓ sitemap.xml généré : ${staticEntries.length} URLs → ${outPath}`);
console.log(`  Dernière modification : ${today}`);
