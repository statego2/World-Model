/** Stable IDs keep a namespace prefix. Labels may change; these strings may not. */
export const STABLE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,48}:[A-Za-z0-9][A-Za-z0-9_.:-]{0,96}$/;

export function isStableId(value: string): boolean {
  return value.length <= 140 && STABLE_ID.test(value);
}
