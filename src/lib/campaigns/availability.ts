export type BookedPeriod = { start_date: string; end_date: string };
export type AvailableSlot = { start: string; end: string };

const DAY_MS = 86_400_000;
const day = (iso: string) => Date.parse(iso + "T00:00:00Z");
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);

export function checkDateOverlap(start: string, end: string, periods: BookedPeriod[]) {
  return periods.find((p) => p.start_date <= end && p.end_date >= start) ?? null;
}

/** Nearest whole slots of the requested duration, strictly before/after the request. */
export function nearestAvailableSlots(
  start: string,
  end: string,
  periods: BookedPeriod[],
  earliest: string,
): { before: AvailableSlot | null; after: AvailableSlot } {
  const duration = day(end) - day(start);
  if (duration < 0 || !Number.isFinite(duration)) throw new Error("Invalid date range");
  let beforeEnd = day(start) - DAY_MS;
  while (beforeEnd - duration >= day(earliest)) {
    const overlaps = periods.filter(
      (p) => day(p.start_date) <= beforeEnd && day(p.end_date) >= beforeEnd - duration,
    );
    if (!overlaps.length) break;
    beforeEnd = Math.min(...overlaps.map((p) => day(p.start_date))) - DAY_MS;
  }
  let afterStart = Math.max(day(end) + DAY_MS, day(earliest));
  while (true) {
    const overlaps = periods.filter(
      (p) => day(p.start_date) <= afterStart + duration && day(p.end_date) >= afterStart,
    );
    if (!overlaps.length) break;
    afterStart = Math.max(...overlaps.map((p) => day(p.end_date))) + DAY_MS;
  }
  return {
    before: beforeEnd - duration < day(earliest)
      ? null
      : { start: iso(beforeEnd - duration), end: iso(beforeEnd) },
    after: { start: iso(afterStart), end: iso(afterStart + duration) },
  };
}