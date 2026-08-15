/**
 * Unit Tests for Slot Generator Engine
 */

import { describe, expect, it } from 'vitest';
import {
  applyTravelBuffer,
  applyUnavailableDates,
  calculateSlotEnd,
  doesSlotOverlap,
  filterPastSlots,
  generateTimeSlots,
  isSlotInsideWorkingPeriod,
  type BarberTimeSlot,
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

/**
 * Date-aware eligibility through the full generation pipeline.
 *
 * `now` is injected so these assertions are fixed in time; 2026-08-16T07:20:00Z is
 * 16 Aug 2026 14:20 in Asia/Jakarta, the canonical booking zone.
 */
describe('Slot Generator Engine - date-aware slot eligibility', () => {
  const NOW = new Date('2026-08-16T07:20:00Z'); // 16 Aug 2026, 14:20 WIB
  const NOW_LATE_NIGHT = new Date('2026-08-16T16:30:00Z'); // 16 Aug 2026, 23:30 WIB

  const generateForDate = (date: string, now: Date = NOW) =>
    generateTimeSlots({
      date,
      workingHours: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      now,
    });

  const availabilityAt = (date: string, time: string, now: Date = NOW) =>
    generateForDate(date, now).find((s) => s.time === time)?.available;

  it('past date: every slot is unavailable, including times that are valid today', () => {
    const slots = generateForDate('2026-08-15');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => !s.available)).toBe(true);
    expect(availabilityAt('2026-08-15', '15:30')).toBe(false);
  });

  it('today: elapsed slots and slots inside the 60-minute lead window are unavailable', () => {
    expect(availabilityAt('2026-08-16', '09:00')).toBe(false);
    expect(availabilityAt('2026-08-16', '14:00')).toBe(false);
    expect(availabilityAt('2026-08-16', '15:00')).toBe(false);
    expect(availabilityAt('2026-08-16', '15:30')).toBe(true);
    expect(availabilityAt('2026-08-16', '16:00')).toBe(true);
  });

  it('today: 15:30 is the first available slot on a 30-minute grid', () => {
    const firstAvailable = generateForDate('2026-08-16').find((s) => s.available);
    expect(firstAvailable?.time).toBe('15:30');
  });

  it('today: reports "Waktu telah berlalu" vs the lead-time reason distinctly', () => {
    const slots = generateForDate('2026-08-16');
    expect(slots.find((s) => s.time === '14:00')?.reason).toBe('Waktu telah berlalu');
    expect(slots.find((s) => s.time === '15:00')?.reason).toBe('Pemesanan minimal 60 menit sebelumnya');
  });

  it('tomorrow: morning slots stay available even though those hours elapsed today', () => {
    for (const time of ['08:00', '09:00', '10:00', '13:00', '14:00', '15:00']) {
      expect(availabilityAt('2026-08-17', time)).toBe(true);
    }
    expect(generateForDate('2026-08-17').every((s) => s.available)).toBe(true);
  });

  it('future date: all slots available, with no reason attached', () => {
    const slots = generateForDate('2026-08-20');
    expect(slots.every((s) => s.available && s.reason === undefined)).toBe(true);
  });

  it('future dates still respect real constraints (bookings, breaks)', () => {
    const slots = generateTimeSlots({
      date: '2026-08-17',
      workingHours: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      breaks: [{ start: '12:00', end: '13:00' }],
      existingBookings: [{ startTime: '09:00', durationMinutes: 30, status: 'accepted' }],
      now: NOW,
    });

    expect(slots.find((s) => s.time === '09:00')?.available).toBe(false);
    expect(slots.find((s) => s.time === '09:00')?.reason).toBe('Sudah dibooking');
    expect(slots.find((s) => s.time === '12:00')?.available).toBe(false);
    expect(slots.find((s) => s.time === '12:00')?.reason).toBe('Waktu istirahat');
    expect(slots.find((s) => s.time === '08:00')?.available).toBe(true);
  });

  it('cross-midnight: tomorrow 00:00 is still blocked by the lead time at 23:30 tonight', () => {
    const slots = generateTimeSlots({
      date: '2026-08-17',
      workingHours: { isOpen: true, openTime: '00:00', closeTime: '06:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      now: NOW_LATE_NIGHT,
    });

    expect(slots.find((s) => s.time === '00:00')?.available).toBe(false);
    expect(slots.find((s) => s.time === '00:00')?.reason).toBe('Pemesanan minimal 60 menit sebelumnya');
    expect(slots.find((s) => s.time === '00:30')?.available).toBe(true);
    expect(slots.find((s) => s.time === '01:00')?.available).toBe(true);
  });

  it('filterPastSlots never re-enables a slot another constraint already blocked', () => {
    const slots: BarberTimeSlot[] = [
      { id: 'a', time: '09:00', endTime: '09:30', available: false, reason: 'Sudah dibooking' },
      { id: 'b', time: '10:00', endTime: '10:30', available: true },
    ];

    const filtered = filterPastSlots(slots, '2026-08-17', 'Asia/Jakarta', NOW);
    expect(filtered[0]).toEqual(slots[0]);
    expect(filtered[1].available).toBe(true);
  });
});
