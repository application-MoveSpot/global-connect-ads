import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdminMFAStatus } from "../mfa-status.ts";

// Case 1: factor enrolled but TOTP not yet challenged → aal1 session, needs challenge
test("aal1 with enrolled factor (nextLevel aal2) → level aal1, needsEnrollment false", () => {
  const result = computeAdminMFAStatus("aal1", "aal2");
  assert.equal(result.level, "aal1");
  assert.equal(result.needsEnrollment, false);
});

// Case 2: TOTP challenge completed → aal2 session, all good
test("aal2 session → level aal2, needsEnrollment false", () => {
  const result = computeAdminMFAStatus("aal2", "aal2");
  assert.equal(result.level, "aal2");
  assert.equal(result.needsEnrollment, false);
});

// Case 3: no TOTP factor enrolled at all → nextLevel stays aal1, must enroll
test("no factor enrolled (nextLevel aal1) → needsEnrollment true", () => {
  const result = computeAdminMFAStatus("aal1", "aal1");
  assert.equal(result.level, "aal1");
  assert.equal(result.needsEnrollment, true);
});

test("missing assurance levels retain the aal1 fallback, never aal2", () => {
  const result = computeAdminMFAStatus(null, null);
  assert.equal(result.level, "aal1");
  assert.equal(result.needsEnrollment, false);
});
