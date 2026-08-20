/**
 * Builds a full calendar grid (leading + trailing null padding to complete
 * every week to 7 cells) for a month with `daysInMonth` days whose 1st falls
 * on `firstDayOfWeek` (0=Sunday..6=Saturday, i.e. Date.getDay()'s range).
 *
 * The trailing pad matters as much as the leading one: without it, a short
 * last row (e.g. just the 29th-31st) rendered with `justify-between` spreads
 * those 2-3 cells across the full row width instead of aligning them under
 * their correct weekday columns -- the "30/31 detached from the grid" bug
 * in DatePicker.tsx. A real (invisible) 7th cell keeps spacing identical to
 * every full row.
 *
 * Kept dependency-free (no react-native import) so it can be unit tested
 * directly -- importing DatePicker.tsx itself would pull in react-native's
 * untranspiled Flow source, which the test bundler can't parse.
 */
export function buildCalendarGrid(daysInMonth: number, firstDayOfWeek: number): (number | null)[] {
  const days: (number | null)[] = Array(firstDayOfWeek).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}
