/**
 * CSS Safety — régression sur les patterns CSS dangereux connus.
 *
 * Tests source-level (lecture de fichier, pas de navigateur requis).
 * Servent de garde-fou contre les bugs de composition Chromium :
 *   - mix-blend-mode sans clip-path → bleed visuel hors du polygon
 *   - isolation: isolate manquant sur le frame
 *
 * Quand un nouveau bug CSS est découvert et corrigé, ajouter un test ici.
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const STYLES_PATH = path.join(process.cwd(), "src/styles.css");

function getStyleLines(): string[] {
  return fs.readFileSync(STYLES_PATH, "utf-8").split("\n");
}

function getRuleForSelector(selector: string): string | undefined {
  return getStyleLines().find((l) => l.includes(selector));
}

// ── Règle 1 : mix-blend-mode → clip-path obligatoire ─────────────────────────
//
// BUG CHROMIUM : les éléments avec mix-blend-mode non-normal sont composités
// dans une couche GPU séparée. Le clip-path du PARENT ne s'applique pas à cette
// couche → le blend "saigne" hors du polygon de covering, déformant les zones
// adjacentes (ex : fond droit du véhicule).
//
// FIX : ajouter clip-path: inherit sur chaque sélecteur avec mix-blend-mode ≠ normal.

test.describe("CSS Safety — mix-blend-mode + clip-path (anti-bleed Chromium)", () => {
  test(".covering-texture a clip-path: inherit", () => {
    const rule = getRuleForSelector(".covering-texture");
    expect(
      rule,
      "Règle .covering-texture introuvable dans src/styles.css",
    ).toBeTruthy();
    expect(
      rule,
      ".covering-texture a mix-blend-mode: multiply mais pas de clip-path: inherit.\n" +
        "→ Chromium ne clippera pas le blend GPU hors du polygon.\n" +
        "Fix : ajouter clip-path: inherit à .covering-texture",
    ).toContain("clip-path: inherit");
  });

  test(".covering-reflections a clip-path: inherit", () => {
    const rule = getRuleForSelector(".covering-reflections");
    expect(
      rule,
      "Règle .covering-reflections introuvable dans src/styles.css",
    ).toBeTruthy();
    expect(
      rule,
      ".covering-reflections a mix-blend-mode: screen mais pas de clip-path: inherit.\n" +
        "→ Chromium ne clippera pas le blend GPU hors du polygon.\n" +
        "Fix : ajouter clip-path: inherit à .covering-reflections",
    ).toContain("clip-path: inherit");
  });

  test("aucun sélecteur CSS n'a mix-blend-mode non-normal sans clip-path", () => {
    const css = fs.readFileSync(STYLES_PATH, "utf-8");
    // Parse CSS blocks (sélecteur + règles sur une ligne ou multiligne)
    const blocks = css.match(/\.[a-zA-Z][a-zA-Z0-9_-]*[^{]*\{[^}]+\}/g) ?? [];

    const dangerous = blocks.filter((block) => {
      const hasNonNormalBlend = /mix-blend-mode\s*:\s*(?!normal\b)[a-z-]+/.test(block);
      const hasClipPath = /clip-path/.test(block);
      return hasNonNormalBlend && !hasClipPath;
    });

    expect(
      dangerous,
      "Sélecteurs CSS avec mix-blend-mode non-normal SANS clip-path :\n" +
        dangerous.map((r) => "  ❌ " + r.trim().slice(0, 120)).join("\n") +
        "\n→ Ajouter clip-path: inherit sur chaque sélecteur concerné.",
    ).toHaveLength(0);
  });
});

// ── Règle 2 : covering-frame doit rester isolé ───────────────────────────────
//
// isolation: isolate sur .covering-frame crée un contexte de composition qui
// contient tous les blends à l'intérieur du cadre.
// Sans lui, mix-blend-mode: screen bleederait sur la page entière.

test.describe("CSS Safety — isolation du covering-frame", () => {
  test(".covering-frame a isolation: isolate", () => {
    const rule = getRuleForSelector(".covering-frame");
    expect(
      rule,
      "Règle .covering-frame introuvable dans src/styles.css",
    ).toBeTruthy();
    expect(
      rule,
      ".covering-frame n'a pas isolation: isolate.\n" +
        "→ Les mix-blend-mode des textures de covering sortiront du composant.\n" +
        "Fix : ajouter isolation: isolate à .covering-frame",
    ).toContain("isolation: isolate");
  });
});

// ── Règle 3 : covering-clip est bien positionné ──────────────────────────────
//
// .covering-clip doit être position: absolute; inset: 0 pour couvrir exactement
// la surface du covering-frame et aligner le clip-path polygon.

test.describe("CSS Safety — positioning du covering-clip", () => {
  test(".covering-clip est position: absolute avec inset: 0", () => {
    const rule = getRuleForSelector(".covering-clip");
    expect(
      rule,
      "Règle .covering-clip introuvable dans src/styles.css",
    ).toBeTruthy();
    expect(rule).toContain("position: absolute");
    expect(rule).toContain("inset: 0");
  });
});
