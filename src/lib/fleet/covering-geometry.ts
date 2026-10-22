import { Matrix, solve } from "ml-matrix";

export type CoveringPoint = { x: number; y: number };
export type CoveringQuad = [CoveringPoint, CoveringPoint, CoveringPoint, CoveringPoint];
export type CoveringEntry = { points: CoveringQuad; photoPath?: string };
export type CoveringZone = Record<number, CoveringEntry>;

// Coordinates use the same centered, object-cover 16:9 frame in both views.
// Represents a single rear-door panel on a typical sedan/hatchback side view.
// Slight rightward taper simulates the camera angle perspective.
export const FALLBACK_COVERING_QUAD: CoveringQuad = [
  { x: 0.38, y: 0.36 }, { x: 0.62, y: 0.37 },
  { x: 0.63, y: 0.64 }, { x: 0.37, y: 0.63 },
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

// Accept either winding while preserving the selected first corner. Never sort
// corners by angle: that would silently repair a genuinely crossed selection.
export function normalizeCoveringQuad(points: CoveringPoint[]): CoveringQuad | null {
  if (isCoveringQuad(points)) return points;
  if (points.length !== 4) return null;
  const reversed = [points[0], points[3], points[2], points[1]];
  return isCoveringQuad(reversed) ? reversed : null;
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
  const source = [[0, 0], [planeWidth, 0], [planeWidth, planeHeight], [0, planeHeight]];
  const rows: number[][] = [];
  const targets: number[][] = [];
  source.forEach(([x = 0, y = 0], i) => {
    const u = destination[i * 2] ?? 0;
    const v = destination[i * 2 + 1] ?? 0;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]);
    targets.push([u], [v]);
  });
  let coeffs: number[];
  try { coeffs = solve(new Matrix(rows), new Matrix(targets)).to1DArray(); }
  catch { return null; }
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = coeffs;
  if ([a, b, c, d, e, f, g, h].some((n) => n === undefined || !Number.isFinite(n))) return null;
  // CSS is column-major. W = g*x+h*y+1 gives an actual projective divide,
  // not an affine skew or a decorative displacement filter.
  return {
    width: planeWidth,
    height: planeHeight,
    transform: `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`,
    projection: {
      transform(x: number, y: number): [number, number] {
        const w = g * x + h * y + 1;
        return [(a * x + b * y + c) / w, (d * x + e * y + f) / w];
      },
    },
  };
}