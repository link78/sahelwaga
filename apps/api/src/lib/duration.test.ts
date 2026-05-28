import { describe, expect, it } from 'vitest';
import { parseDurationToMs } from './duration.js';

describe('parseDurationToMs', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 15 * 60_000],
    ['12h', 12 * 3_600_000],
    ['7d', 7 * 86_400_000],
    ['2w', 14 * 86_400_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it('returns null for unparseable input', () => {
    expect(parseDurationToMs('forever')).toBeNull();
    expect(parseDurationToMs('')).toBeNull();
    expect(parseDurationToMs('15')).toBeNull();
  });
});
