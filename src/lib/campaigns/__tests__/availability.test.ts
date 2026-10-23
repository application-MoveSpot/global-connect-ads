import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDateOverlap, nearestAvailableSlots } from "../availability.ts";

test("occupied start and end dates are inclusive", () => {
  const periods = [{ start_date: "2026-11-10", end_date: "2026-11-15" }];
  assert.deepEqual(checkDateOverlap("2026-11-15", "2026-11-17", periods), periods[0]);
  assert.deepEqual(checkDateOverlap("2026-11-08", "2026-11-10", periods), periods[0]);
  assert.equal(checkDateOverlap("2026-11-16", "2026-11-18", periods), null);
});

test("offers nearest slots before and after with the same three-day duration", () => {
  assert.deepEqual(
    nearestAvailableSlots(
      "2026-11-12",
      "2026-11-14",
      [{ start_date: "2026-11-10", end_date: "2026-11-15" }],
      "2026-10-24",
    ),
    {
      before: { start: "2026-11-07", end: "2026-11-09" },
      after: { start: "2026-11-16", end: "2026-11-18" },
    },
  );
});

test("skips overlapping, nested and adjacent occupied periods in both directions", () => {
  assert.deepEqual(
    nearestAvailableSlots(
      "2026-11-12",
      "2026-11-14",
      [
        { start_date: "2026-11-16", end_date: "2026-11-18" },
        { start_date: "2026-11-11", end_date: "2026-11-12" },
        { start_date: "2026-11-07", end_date: "2026-11-11" },
        { start_date: "2026-11-10", end_date: "2026-11-15" },
      ],
      "2026-10-24",
    ),
    {
      before: { start: "2026-11-04", end: "2026-11-06" },
      after: { start: "2026-11-19", end: "2026-11-21" },
    },
  );
});

test("does not offer a slot before the earliest reservable date", () => {
  assert.equal(nearestAvailableSlots("2026-10-25", "2026-10-27", [], "2026-10-24").before, null);
});

test("handles single-day campaigns and year boundaries", () => {
  assert.deepEqual(nearestAvailableSlots("2026-12-31", "2026-12-31", [], "2026-10-24"), {
    before: { start: "2026-12-30", end: "2026-12-30" },
    after: { start: "2027-01-01", end: "2027-01-01" },
  });
});
