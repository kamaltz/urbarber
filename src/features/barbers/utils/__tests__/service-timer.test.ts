import { describe, expect, it } from 'vitest';
import { formatElapsed, getElapsedSeconds, getElapsedTime, hasExceededEstimate } from '../service-timer';

describe('getElapsedSeconds', () => {
  it('1. returns null when startedAt is missing (service not yet started)', () => {
    expect(getElapsedSeconds(undefined)).toBeNull();
    expect(getElapsedSeconds(null)).toBeNull();
    expect(getElapsedSeconds('')).toBeNull();
  });

  it('2. returns null for an unparseable timestamp instead of NaN', () => {
    expect(getElapsedSeconds('not-a-date')).toBeNull();
  });

  it('3. computes elapsed seconds from a real ISO timestamp', () => {
    const startedAt = '2026-08-19T10:00:00.000Z';
    const now = new Date('2026-08-19T10:18:42.000Z').getTime();
    expect(getElapsedSeconds(startedAt, now)).toBe(18 * 60 + 42);
  });

  it('4. never returns a negative value (clock skew guard)', () => {
    const startedAt = '2026-08-19T10:00:00.000Z';
    const now = new Date('2026-08-19T09:59:00.000Z').getTime(); // "now" before startedAt
    expect(getElapsedSeconds(startedAt, now)).toBe(0);
  });

  it('5. recovers correctly across a simulated remount -- same startedAt + a later now always yields the same result, never resets to 0', () => {
    const startedAt = '2026-08-19T10:00:00.000Z';
    const firstRead = getElapsedSeconds(startedAt, new Date('2026-08-19T10:05:00.000Z').getTime());
    const afterRemount = getElapsedSeconds(startedAt, new Date('2026-08-19T10:06:00.000Z').getTime());
    expect(firstRead).toBe(300);
    expect(afterRemount).toBe(360);
    expect(afterRemount).toBeGreaterThan(firstRead!);
  });
});

describe('formatElapsed', () => {
  it('formats HH:MM:SS with zero-padding', () => {
    expect(formatElapsed(0)).toBe('00:00:00');
    expect(formatElapsed(42)).toBe('00:00:42');
    expect(formatElapsed(18 * 60 + 42)).toBe('00:18:42');
    expect(formatElapsed(3661)).toBe('01:01:01');
  });

  it('never produces NaN for a negative/invalid input', () => {
    expect(formatElapsed(-5)).toBe('00:00:00');
    expect(formatElapsed(NaN)).toBe('00:00:00');
  });
});

describe('getElapsedTime', () => {
  it('returns null when there is no startedAt', () => {
    expect(getElapsedTime(undefined)).toBeNull();
  });

  it('bundles totalSeconds + formatted together', () => {
    const startedAt = '2026-08-19T10:00:00.000Z';
    const now = new Date('2026-08-19T10:00:05.000Z').getTime();
    expect(getElapsedTime(startedAt, now)).toEqual({ totalSeconds: 5, formatted: '00:00:05' });
  });
});

describe('hasExceededEstimate', () => {
  it('false when no estimate exists -- informational only, never a failure state', () => {
    expect(hasExceededEstimate(999999, null)).toBe(false);
    expect(hasExceededEstimate(999999, undefined)).toBe(false);
    expect(hasExceededEstimate(999999, 0)).toBe(false);
  });

  it('false while still within the estimated duration', () => {
    expect(hasExceededEstimate(29 * 60, 30)).toBe(false);
  });

  it('true once elapsed passes the estimate', () => {
    expect(hasExceededEstimate(31 * 60, 30)).toBe(true);
  });
});
