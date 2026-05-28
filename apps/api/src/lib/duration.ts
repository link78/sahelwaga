/**
 * Parse a duration string like `15m`, `7d`, `12h`, `30s`, `500ms` to
 * milliseconds. Returns `null` if the input is not a recognised shape. Used
 * for converting our JWT TTL strings (which are kept human-readable for ops)
 * into the millisecond values needed for cookies / refresh-token expiries.
 */
export function parseDurationToMs(input: string): number | null {
  const m = /^\s*(\d+)\s*(ms|s|m|h|d|w)\s*$/.exec(input);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 'ms': return n;
    case 's': return n * 1000;
    case 'm': return n * 60_000;
    case 'h': return n * 3_600_000;
    case 'd': return n * 86_400_000;
    case 'w': return n * 7 * 86_400_000;
    default: return null;
  }
}
