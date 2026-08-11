/**
 * Unit Tests for resolveInitialScheduleDate (Batch 10B-5D)
 * Regression guard: booking/options.tsx requires the customer to pick a date and
 * forwards it as the `date` route param, but booking/schedule.tsx previously ignored
 * it and always re-seeded its own DatePicker to today via useScheduleSelector. Any
 * customer testing outside today's remaining open hours landed on a correctly
 * generated but entirely-in-the-past slot list (all slots disabled), with no
 * indication they needed to re-pick a date on the second screen.
 */
import { describe, expect, it, vi } from 'vitest';

// use-schedule-selector.ts imports bookingRepository, which transitively pulls in
// @/lib/firebase (react-native-dependent, unparseable under plain vitest) at module
// load time. resolveInitialScheduleDate doesn't touch either -- mock both away so
// importing the module under test doesn't require the real Firebase/RN chain.
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: { now: vi.fn() },
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  firebaseAuth: {},
}));

import { resolveInitialScheduleDate } from '../use-schedule-selector';

describe('resolveInitialScheduleDate', () => {
  it('uses the date carried over from booking/options when present', () => {
    expect(resolveInitialScheduleDate('2026-08-18', '2026-08-11')).toBe('2026-08-18');
  });

  it('falls back to today when no initial date was forwarded (e.g. rebook flow)', () => {
    expect(resolveInitialScheduleDate(undefined, '2026-08-11')).toBe('2026-08-11');
  });

  it('falls back to today when the forwarded date is an empty string', () => {
    expect(resolveInitialScheduleDate('', '2026-08-11')).toBe('2026-08-11');
  });
});
