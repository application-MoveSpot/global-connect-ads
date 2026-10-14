/**
 * Détecte les textes en anglais dans une interface censée être en français.
 * Heuristique légère côté client — aucun appel réseau dans ce module.
 */

export type LangIssue = {
  textSnippet: string;
  elementPath: string;
  detectedLang: "en";
  expectedLang: "fr";
};

// Mots anglais qui ne devraient jamais apparaître dans une UI française.
// On exclut les faux-positifs (mots communs aux deux langues).
const EN_SIGNALS = [
  // Mots UI typiquement anglais
  /\bsubtitle\b/i,
  /\bplaceholder\b/i,
  /\bloading\b/i,
  /\bsettings\b/i,
  /\boverview\b/i,
  /\bdashboard\b/i,
  /\bcheckout\b/i,
  /\bsignup\b/i,
  /\bsign\s+up\b/i,
  /\bsign\s+in\b/i,
  /\blog\s*out\b/i,
  /\bsubmit\b/i,
  /\bcancel\b/i,
  /\bsaved\b/i,
  /\bclick\s+here\b/i,
  /\blearn\s+more\b/i,
  /\bget\s+started\b/i,
  /\bread\s+more\b/i,
  /\bview\s+all\b/i,
  /\bview\s+details\b/i,
  /\bmore\s+details\b/i,
  // Préfixes anglais de possession courants dans les placeholders
  /\bmy\s+[a-zàâçéèêëîïôùûü]/i,
  // Mots isolés souvent laissés en anglais dans les maquettes
  /\btip\b/i,
  /\bnotice\b/i,
  /\bbadge\b/i,
  /\btoast\b/i,
  /\bmodal\b/i,
  /\bdrawer\b/i,
  /\btoggle\b/i,
  /\bchip\b/i,
  /\bwidget\b/i,
  /\bwelcome\b/i,
  /\bhello\b/i,
  /\bhi\b[\s,!]/i,
  // Patterns d'erreur anglais
  /\bsomething\s+went\s+wrong\b/i,
  /\btry\s+again\b/i,
  /\ban\s+error\s+occurred\b/i,
  // Mots courants de contenu anglais dans les placeholders
  /\bpricing\b/i,
  /\bfeature[s]?\b/i,
  /\btestimonial[s]?\b/i,
  /\bfooter\b/i,
  /\bheader\b/i,
  /\bsidebar\b/i,
  /\bnavbar\b/i,
  /\bbanner\b/i,
];

// Sélecteurs à ignorer : éléments non-UI ou techniques
const SKIP_SELECTORS = [
  "script",
  "style",
  "meta",
  "head",
  "noscript",
  "template",
  "code",
  "pre",
  "kbd",
  "samp",
  "[data-lang-skip]",
  "[aria-hidden='true']",
  ".sr-only",
];

function buildElementPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.body && depth < 5) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : "";
    const cls = Array.from(current.classList)
      .filter((c) => !c.match(/^[a-z0-9_-]+$/i) === false && c.length < 30)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join("");
    parts.unshift(`${tag}${id}${cls}`);
    current = current.parentElement;
    depth++;
  }
  return parts.join(" > ");
}

function shouldSkip(el: Element): boolean {
  return SKIP_SELECTORS.some((sel) => {
    try {
      return el.matches(sel);
    } catch {
      return false;
    }
  });
}

function isEnglish(text: string): boolean {
  return EN_SIGNALS.some((re) => re.test(text));
}

export function scanPageForLanguageIssues(): LangIssue[] {
  if (typeof document === "undefined") return [];

  const issues: LangIssue[] = [];
  const seen = new Set<string>();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
      const text = (node.textContent ?? "").trim();
      if (text.length < 3) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node.textContent ?? "").trim();
    if (!isEnglish(text)) continue;

    const snippet = text.slice(0, 120);
    if (seen.has(snippet)) continue;
    seen.add(snippet);

    const parent = (node as Text).parentElement;
    issues.push({
      textSnippet: snippet,
      elementPath: parent ? buildElementPath(parent) : "unknown",
      detectedLang: "en",
      expectedLang: "fr",
    });

    if (issues.length >= 20) break; // cap per scan
  }

  return issues;
}
