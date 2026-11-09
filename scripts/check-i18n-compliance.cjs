#!/usr/bin/env node
/**
 * check-i18n-compliance.cjs
 *
 * Finds English role terms in user-facing display text.
 *
 * TWO modes:
 *
 * 1. fr.json: flags translation VALUES (right of colon) containing role terms.
 *    Skips values that only use the term as a {{variable}} interpolation.
 *
 * 2. TSX/TS source: flags prose string literals (strings with spaces, >15 chars)
 *    that contain role terms and are NOT in a technical context.
 *    "Prose" = unlikely to be a queryKey, import path, or CSS class.
 *
 * Terms: advertiser(s), owner(s), driver(s), partner(s), provider(s), Dashboard.
 *
 * Exit: 0 = clean, 1 = violations found.
 */

"use strict";
const fs = require("fs");
const path = require("path");

const BASE_DIR = process.cwd();

const LOCALE_FILES = ["src/locales/fr.json"];
const SRC_DIRS = ["src/routes", "src/components"];
const SRC_EXT = new Set([".tsx", ".ts", ".jsx", ".js"]);

const TERMS = [
  { re: /\badvertisers?\b/i, label: "advertiser(s)", fix: "annonceur(s)" },
  { re: /\bowners?\b/i,       label: "owner(s)",       fix: "propriétaire(s)" },
  { re: /\bdrivers?\b/i,      label: "driver(s)",       fix: "chauffeur(s)" },
  { re: /\bpartners?\b/i,     label: "partner(s)",     fix: "partenaire(s)" },
  { re: /\bproviders?\b/i,    label: "provider(s)",    fix: "poseur(s) / prestataire(s)" },
  { re: /\bDashboard\b/,      label: "Dashboard",       fix: '"Tableau de bord"' },
];

// ── 1. JSON scanner ──────────────────────────────────────────────────────────

function scanJson(relPath) {
  const absPath = path.join(BASE_DIR, relPath);
  if (!fs.existsSync(absPath)) return [];
  const lines = fs.readFileSync(absPath, "utf8").split("\n");
  const violations = [];

  lines.forEach((raw, idx) => {
    // Match a JSON value line:  "key": "value text"
    const m = raw.match(/^\s*"[^"]+"\s*:\s*"(.+)"\s*,?\s*$/);
    if (!m) return;
    const value = m[1];

    for (const { re, label, fix } of TERMS) {
      re.lastIndex = 0;
      if (!re.test(value)) continue;

      // Skip if the ONLY occurrence is inside a {{placeholder}} interpolation
      const stripped = value.replace(/\{\{[^}]+\}\}/g, "");
      re.lastIndex = 0;
      if (!re.test(stripped)) continue;

      violations.push({ file: relPath, line: idx + 1, text: raw.trim().slice(0, 120), label, fix });
      break;
    }
  });
  return violations;
}

// ── 2. TSX / TS scanner ──────────────────────────────────────────────────────

// Lines that are definitely NOT display text:
const SKIP_LINE = [
  /^\s*\/\//, // comment
  /^\s*\*/, // JSDoc
  /^\s*import\b/, // import statement
  /\} from ["']/, // import continuation
  /^\s*export\s+(type|interface|function|class|const|enum|default)\b/, // export
  /\bt\s*\(["']/, /\btx\s*\(["']/, // translation function calls
  /queryKey\s*:\s*\[/, // react-query keys
  /supabase\.(from|rpc|storage|auth)/, // supabase calls
  /\.from\(["']/, // storage.from("bucket")
  /queryClient\.(invalidate|set|get)/, // query client calls
  /"@type"\s*:/, /"@context"\s*:/, /"@id"\s*:/, // JSON-LD
  /provider\s*:\s*\{/, // JSON-LD provider object
  /lang\s*===\s*["']en["']/, // bilingual ternary
  /\ben\s*:\s*\[/, // start of en: array
  // skip import/module path strings
  /["'][./][@\w/-]*["']/, // relative or npm paths
];

// A string is considered PROSE (display candidate) if:
//   - it has spaces (natural language), AND
//   - it is longer than 12 chars, AND
//   - it doesn't look like a technical identifier or path
function isProse(s) {
  if (s.length < 12) return false;
  if (!/\s/.test(s)) return false; // no spaces → not prose
  if (/^[\w-]+(\.[\w-]+)+$/.test(s)) return false; // dotted.path.identifier
  if (/^\/[\w/-]+$/.test(s)) return false; // /url/path
  if (/(?:flex|grid|text-|bg-|border-|hover:|focus:|px-|py-|mt-|mb-|gap-|rounded)/.test(s)) return false; // CSS
  return true;
}

function scanSource(filePath) {
  const relPath = path.relative(BASE_DIR, filePath);
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const violations = [];
  let inEnArray = false;

  let enDepth = 0;
  lines.forEach((line, idx) => {
    // Track en: { ... } and en: [ ... ] blocks (legitimate English copy)
    if (/\ben\s*:\s*[\[{]/.test(line)) { inEnArray = true; enDepth = 0; }
    if (inEnArray) {
      enDepth += (line.match(/[{[]/g) || []).length;
      enDepth -= (line.match(/[}\]]/g) || []).length;
      if (enDepth <= 0 && /[}\]]/.test(line)) inEnArray = false;
      else return; // still inside English block
    }

    if (SKIP_LINE.some((re) => re.test(line))) return;

    // Extract quoted string values from the line
    const re = /"([^"\\]{12,})"/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const s = m[1];
      if (!isProse(s)) continue;

      for (const { re: termRe, label, fix } of TERMS) {
        termRe.lastIndex = 0;
        if (!termRe.test(s)) continue;
        violations.push({ file: relPath, line: idx + 1, text: line.trim().slice(0, 120), label, fix });
        return; // one violation per line
      }
    }
  });

  return violations;
}

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkDir(full));
    else if (SRC_EXT.has(path.extname(e.name))) results.push(full);
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const violations = [];

  for (const f of LOCALE_FILES) violations.push(...scanJson(f));

  for (const dir of SRC_DIRS) {
    for (const file of walkDir(path.join(BASE_DIR, dir)))
      violations.push(...scanSource(file));
  }

  if (violations.length === 0) {
    console.log("✅ i18n compliance: aucun terme anglais détecté dans les textes affichés.");
    process.exit(0);
  }

  console.error(`\n❌ i18n compliance: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.label} → ${v.fix}]`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

main();
