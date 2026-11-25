import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPhotoStatusApproved } from "../installer-payout.server.ts";

// ─── Pose ────────────────────────────────────────────────────────────────────

test("pose — bloque le virement si installation_status est 'pending'", () => {
  assert.throws(
    () => assertPhotoStatusApproved("pending", "pose"),
    (err: Error) => {
      assert.ok(err.message.includes("photographies de pose"));
      assert.ok(err.message.includes("statut actuel : pending"));
      return true;
    },
  );
});

test("pose — bloque le virement si installation_status est null (absent)", () => {
  assert.throws(
    () => assertPhotoStatusApproved(null, "pose"),
    (err: Error) => {
      assert.ok(err.message.includes("statut actuel : absent"));
      return true;
    },
  );
});

test("pose — bloque le virement si installation_status est 'rejected'", () => {
  assert.throws(
    () => assertPhotoStatusApproved("rejected", "pose"),
    (err: Error) => {
      assert.ok(err.message.includes("statut actuel : rejected"));
      return true;
    },
  );
});

test("pose — autorise le passage si installation_status est 'approved'", () => {
  assert.doesNotThrow(() => assertPhotoStatusApproved("approved", "pose"));
});

// ─── Dépose ──────────────────────────────────────────────────────────────────

test("dépose — bloque le virement si depose_status est 'pending'", () => {
  assert.throws(
    () => assertPhotoStatusApproved("pending", "depose"),
    (err: Error) => {
      assert.ok(err.message.includes("photographies de dépose"));
      assert.ok(err.message.includes("statut actuel : pending"));
      return true;
    },
  );
});

test("dépose — bloque le virement si depose_status est null (absent)", () => {
  assert.throws(
    () => assertPhotoStatusApproved(null, "depose"),
    (err: Error) => {
      assert.ok(err.message.includes("photographies de dépose"));
      assert.ok(err.message.includes("statut actuel : absent"));
      return true;
    },
  );
});

test("dépose — autorise le passage si depose_status est 'approved'", () => {
  assert.doesNotThrow(() => assertPhotoStatusApproved("approved", "depose"));
});

// ─── Invariant de sécurité ───────────────────────────────────────────────────

test("aucune valeur autre que 'approved' ne franchit le guard", () => {
  const values = ["", "pending_approval", "pending", "rejected", "transferred", "done", undefined];
  for (const v of values) {
    assert.throws(
      () => assertPhotoStatusApproved(v as string | null | undefined, "pose"),
      { name: "Error" },
      `La valeur "${v}" aurait dû être bloquée`,
    );
  }
});
