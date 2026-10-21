import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJsonObject } from "../extract-json.ts";

const PAYLOAD = '{"name":"Van","description":"Desc","km_per_day":80}';

test("extracts JSON wrapped in backtick fences", () => {
  assert.equal(JSON.parse(extractJsonObject("```json\n" + PAYLOAD + "\n```")).name, "Van");
});

test("extracts JSON wrapped in triple single-quote fences", () => {
  assert.equal(JSON.parse(extractJsonObject("'''json\n" + PAYLOAD + "\n'''")).name, "Van");
});

test("extracts bare JSON without fences", () => {
  assert.equal(JSON.parse(extractJsonObject(PAYLOAD)).km_per_day, 80);
});

test("extracts JSON surrounded by prose", () => {
  assert.equal(
    JSON.parse(extractJsonObject("Voici la réponse : " + PAYLOAD + " — fin.")).description,
    "Desc",
  );
});

test("throws when no JSON object is present", () => {
  assert.throws(() => extractJsonObject("pas de json ici"), SyntaxError);
});
