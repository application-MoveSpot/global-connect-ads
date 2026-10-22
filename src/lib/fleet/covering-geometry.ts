import PerspectiveTransform from "perspective-transform";

export type CoveringPoint = { x: number; y: number };
export type CoveringQuad = [CoveringPoint, CoveringPoint, CoveringPoint, CoveringPoint];
export type CoveringEntry = { points: CoveringQuad; photoPath?: string };
export type CoveringZone = Record<number, CoveringEntry>;

// Coordinates use the same centered, object-cover 16:9 frame in both views.
export const FALLBACK_COVERING_QUAD: CoveringQuad = [
  { x: 0.12, y: 0.35 }, { x: 0.6, y: 0.35 },
  { x: 0.6, y: 0.75 }, { x: 0.12, y: 0.75 },
];

export function isCoveringQuad(value: unknown): value is CoveringQuad {
  if (!Array.isArray(value) || value.length !== 4) return false;
  if (!value.every((p) => p && typeof p === "object" &&
    typeof p.x === "number" && typeof p.y === "number" &&
    Number.isFinite(p.x) && Number.isFinite(p.y) &&
    p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)) return false;
  // A clockwise convex polygon in screen coordinates: reject crossed, repeated
  // and collinear points before the homography solver can become singular.
  for (let i = 0; i < 4; i++) {
    const a = value[i];
    const b = value[(i + 1) % 4];
    const c = value[(i + 2) % 4];
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 1e-6) return false;
  }
  return true;
}

export function parseCoveringZone(value: unknown): CoveringZone | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed: CoveringZone = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || !entry || typeof entry !== "object" || !("points" in entry)) continue;
    if (!isCoveringQuad(entry.points)) continue;
    parsed[Number(key)] = {
      points: entry.points,
      ...("photoPath" in entry && typeof entry.photoPath === "string" ? { photoPath: entry.photoPath } : {}),
    };
  }
  return Object.keys(parsed).length ? parsed : null;
}

export function zoneForPhoto(zone: CoveringZone | null, index: number, photoPath?: string): CoveringEntry | null {
  const entry = zone?.[index];
  if (!entry || (entry.photoPath && entry.photoPath !== photoPath)) return null;
  return entry;
}

export function coveringProjection(points: CoveringQuad, width: number, height: number) {
  if (!isCoveringQuad(points) || width <= 0 || height <= 0) return null;
  const destination = points.flatMap((p) => [p.x * width, p.y * height]);
  const [tl, tr, br, bl] = points.map((p) => ({ x: p.x * width, y: p.y * height }));
  if (!tl || !tr || !br || !bl) return null;
  const distance = (a: CoveringPoint, b: CoveringPoint) => Math.hypot(b.x - a.x, b.y - a.y);
  const planeWidth = (distance(tl, tr) + distance(bl, br)) / 2;
  const planeHeight = (distance(tl, bl) + distance(tr, br)) / 2;
  const projection = PerspectiveTransform(
    [0, 0, planeWidth, 0, planeWidth, planeHeight, 0, planeHeight], destination,
  );
  const [a, b, c, d, e, f, g, h] = projection.coeffs;
  if ([a, b, c, d, e, f, g, h].some((n) => n === undefined || !Number.isFinite(n))) return null;
  // CSS is column-major. W = g*x+h*y+1 gives an actual projective divide,
  // not an affine skew or a decorative displacement filter.
  return {
    width: planeWidth,
    height: planeHeight,
    transform: `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`,
    projection,
  };
}