import { test } from "node:test";
import assert from "node:assert/strict";
import { singleRelation } from "../postgrest-relation.ts";

test("to-one relations accept object and single-row array responses", () => {
  const profile = { user_id: "assigned-installer", full_name: "Installer" };
  assert.equal(singleRelation(profile), profile);
  assert.equal(singleRelation([profile]), profile);
});

test("missing relations cannot supply an assigned installer", () => {
  assert.equal(singleRelation([]), null);
  assert.equal(singleRelation(null), null);
  assert.equal(singleRelation(undefined), null);
});

test("ambiguous relations cannot supply an assigned installer", () => {
  assert.equal(singleRelation([{ user_id: "first" }, { user_id: "second" }]), null);
});