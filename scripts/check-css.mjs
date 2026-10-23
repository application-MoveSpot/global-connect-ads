#!/usr/bin/env node
/**
 * Garde-fou CSS — détecte les patterns dangereux AVANT le build.
 *
 * Règles vérifiées :
 *   1. mix-blend-mode non-normal sans clip-path → bleed Chromium GPU
 *   2. isolation: isolate absent sur covering-frame
 *
 * Usage : node scripts/check-css.mjs
 * Intégré dans : npm run lint (via "lint:all")
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STYLES = join(ROOT, "src/styles.css");

const css = readFileSync(STYLES, "utf-8");
const issues = [];

// ── Règle 1 : mix-blend-mode non-normal → clip-path obligatoire ──────────────
const blocks = css.match(/\.[a-zA-Z][a-zA-Z0-9_-]*[^{]*\{[^}]+\}/g) ?? [];
for (const block of blocks) {
  const hasNonNormalBlend = /mix-blend-mode\s*:\s*(?!normal\b)[a-z-]+/.test(block);
  const hasClipPath = /clip-path/.test(block);
  if (hasNonNormalBlend && !hasClipPath) {
    const selector = block.match(/^[^{]+/)?.[0].trim() ?? "?";
    issues.push(
      `[mix-blend-mode sans clip-path] ${selector}\n` +
        `  → Chromium composite les blend-modes dans une couche GPU séparée.\n` +
        `     Le clip-path du parent ne s'y applique pas → bleed visuel hors du polygon.\n` +
        `     Fix : ajouter clip-path: inherit sur ce sélecteur.`,
    );
  }
}

// ── Règle 2 : covering-frame doit avoir isolation: isolate ───────────────────
const frameMatch = css.match(/\.covering-frame\s*\{[^}]+\}/);
if (frameMatch && !frameMatch[0].includes("isolation: isolate")) {
  issues.push(
    `[isolation manquante] .covering-frame\n` +
      `  → Sans isolation: isolate, les mix-blend-mode sortent du composant.\n` +
      `     Fix : ajouter isolation: isolate à .covering-frame.`,
  );
}

// ── Résultat ─────────────────────────────────────────────────────────────────
if (issues.length === 0) {
  console.log("✅  CSS safety check — aucun problème détecté");
  process.exit(0);
} else {
  console.error(`\n❌  CSS safety check — ${issues.length} problème(s) détecté(s) :\n`);
  for (const issue of issues) {
    console.error(`  ${issue}\n`);
  }
  process.exit(1);
}
