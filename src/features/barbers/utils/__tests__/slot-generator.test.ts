/**
 * Unit Tests for Slot Generator Engine
 */

import { describe, expect, it } from 'vitest';
import {
  applyTravelBuffer,
  applyUnavailableDates,
  calculateSlotEnd,
  doesSlotOverlap,
  generateTimeSlots,
  isSlotInsideWorkingPeriod,
} from '../slot-generator';

describe('Slot Generator Engine - Pure Functions', () => {
  it('calculateSlotEnd should calculate correct end time string', () => {
    expect(calculateSlotEnd('09:00', 45)).toBe('09:45');
    expect(calculateSlotEnd('11:30', 60)).toBe('12:30');
    expect(calculateSlotEnd('23:30', 45)).toBe('00:15');
  });

  it('isSlotInsideWorkingPeriod should validate boundary conditions correctly', () => {
    expect(isSlotInsideWorkingPeriod('09:00', '09:45', '09:00', '18:00')).toBe(true);
    expect(isSlotInsideWorkingPeriod('08:30', '09:15', '09:00', '18:00')).toBe(false);
    expect(isSlotInsideWorkingPeriod('17:30', '18:15', '09:00', '18:00')).toBe(false);
    expect(isSlotInsideWorkingPeriod('17:15', '18:00', '09:00', '18:00')).toBe(true);
  });

  it('doesSlotOverlap should detect overlaps accurately', () => {
    expect(doesSlotOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);
    expect(doesSlotOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false);
    expect(doesSlotOverlap('09:00', '10:00', '09:15', '09:45')).toBe(true);
    expect(doesSlotOverlap('14:00', '15:00', '12:00', '13:00')).toBe(false);
  });

  it('applyUnavailableDates should identify unavailable dates', () => {
    const dates = ['2026-08-17', '2026-12-25'];
    expect(applyUnavailableDates('2026-08-17', dates)).toBe(true);
    expect(applyUnavailableDates('2026-08-18', dates)).toBe(false);
  });

  it('applyTravelBuffer should expand booked ranges by buffer minutes', () => {
    const ranges = [{ start: '10:00', end: '11:00' }];
    const buffered = applyTravelBuffer(ranges, 15);

    expect(buffered).toEqual([{ start: '09:45', end: '11:15' }]);
  });

  it('generateTimeSlots should return empty list if barber does not accept new bookings', () => {
    const slots = generateTimeSlots({
      date: '2026-12-01',
      workingHours: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      serviceDurationMinutes: 45,
      acceptingNewBookings: false,
    });

    expect(slots).toEqual([]);
  });

  it('generateTimeSlots should filter out slots overlapping existing active bookings', () => {
    const slots = generateTimeSlots({
      date: '2026-12-01',
      workingHours: { isOpen: true, openTime: '09:00', closeTime: '12:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      existingBookings: [
        { startTime: '09:30', durationMinutes: 30, status: 'accepted' },
      ],
    });

    const slot0900 = slots.find((s) => s.time === '09:00');
    const slot0930 = slots.find((s) => s.time === '09:30');
    const slot1000 = slots.find((s) => s.time === '10:00');

    expect(slot0900?.available).toBe(true);
    expect(slot0930?.available).toBe(false);
    expect(slot0930?.reason).toBe('Sudah dibooking');
    expect(slot1000?.available).toBe(true);
  });
});
