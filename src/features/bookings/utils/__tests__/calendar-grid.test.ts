/**
 * Unit tests for buildCalendarGrid (thesis v1.1 stabilization, §19).
 * Regression guard for the "30/31 detached from the grid" bug in
 * DatePicker.tsx: the calendar's last row was only leading-padded (days
 * before the 1st), never trailing-padded (days after the last of the
 * month), so a short last row rendered with `justify-between` spread its
 * 2-3 real cells across the full row width instead of sitting under their
 * correct weekday columns.
 */
import { describe, expect, it } from 'vitest';
import { buildCalendarGrid } from '../calendar-grid';

function realDays(grid: (number | null)[]): number[] {
  return grid.filter((d): d is number => d !== null);
}

describe('buildCalendarGrid', () => {
  it('every row is always a full 7 cells -- grid length is always a multiple of 7', () => {
    // Exhaustively check every possible (daysInMonth, firstDayOfWeek) combination.
    for (let daysInMonth = 28; daysInMonth <= 31; daysInMonth++) {
      for (let firstDayOfWeek = 0; firstDayOfWeek <= 6; firstDayOfWeek++) {
        const grid = buildCalendarGrid(daysInMonth, firstDayOfWeek);
        expect(grid.length % 7).toBe(0);
      }
    }
  });

  it('leading cells before the 1st are null, matching firstDayOfWeek', () => {
    const grid = buildCalendarGrid(30, 3); // month starts on a Wednesday
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toBe(1);
  });

  it('contains every real day exactly once, in order, regardless of trailing padding', () => {
    const grid = buildCalendarGrid(31, 5); // 31-day month, starts on Friday
    expect(realDays(grid)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('28-day February (non-leap): all 28 real days present, grid still a full multiple of 7', () => {
    const grid = buildCalendarGrid(28, 0);
    expect(grid.length % 7).toBe(0);
    expect(realDays(grid)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it('29-day February (leap year): all 29 real days present, grid still a full multiple of 7', () => {
    const grid = buildCalendarGrid(29, 1);
    expect(grid.length % 7).toBe(0);
    expect(realDays(grid)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });

  it('30-day month (e.g. April) starting on a Wednesday: last row is trailing-padded to 7, not left short', () => {
    // 3 leading nulls + 30 days = 33 cells, not a multiple of 7 without
    // trailing padding (needs 2 more to reach 35, i.e. 5 rows of 7).
    const grid = buildCalendarGrid(30, 3);
    expect(grid.length).toBe(35);
    const lastRow = grid.slice(28, 35);
    expect(lastRow).toEqual([26, 27, 28, 29, 30, null, null]);
    expect(lastRow).toHaveLength(7);
  });

  it('31-day month starting on Sunday: trailing padding still applies even with zero leading offset', () => {
    const grid = buildCalendarGrid(31, 0);
    expect(grid.length).toBe(35);
    expect(grid[30]).toBe(31);
    expect(grid.slice(31)).toEqual([null, null, null, null]);
  });
});
