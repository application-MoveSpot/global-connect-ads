import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isPreviewHostname } from "../preview-host.ts";

const ID = "6602bfc2-6e2e-40ba-b6c6-422637ac09e4";

test("le site public MoveSpot n'est jamais considéré comme une prévisualisation", () => {
  for (const host of [
    "move-spot.com",
    "www.move-spot.com",
    "move-spot.lovable.app",
    `project--${ID}.lovable.app`,
    "id-preview--x.evil.com",
    "preview.lovable.app",
  ]) {
    assert.equal(isPreviewHostname(host), false, host);
  }
});

test("les hôtes de prévisualisation et le serveur local sont reconnus", () => {
  for (const host of [
    `id-preview--${ID}.lovable.app`,
    `ID-PREVIEW-6--${ID}.lovable.app`,
    `id-preview-837f4b23--${ID}.lovable.app`,
    "preview--move-spot.lovable.app",
    `project--${ID}-dev.lovable.app`,
    `${ID}.lovableproject.com`,
    `live--${ID}.espace.lovable.app`,
    "localhost",
  ]) {
    assert.equal(isPreviewHostname(host), true, host);
  }
});
