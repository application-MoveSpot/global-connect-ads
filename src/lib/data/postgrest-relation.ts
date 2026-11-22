/** Normalize a to-one relation without trusting ambiguous array responses. */
export function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] ?? null : null;
  }
  return value ?? null;
}