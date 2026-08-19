import { describe, expect, it } from 'vitest';
import { getServiceWorkspaceStage } from '../service-workspace-stage';

describe('getServiceWorkspaceStage', () => {
  it('1. pending -> requires_response regardless of service type', () => {
    expect(getServiceWorkspaceStage({ bookingStatus: 'pending', isHomeService: true })).toBe('requires_response');
    expect(getServiceWorkspaceStage({ bookingStatus: 'pending', isHomeService: false })).toBe('requires_response');
  });

  describe('Home Service', () => {
    it('2. accepted, no tracking yet -> awaiting_trip (can start trip)', () => {
      expect(getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: true })).toBe('awaiting_trip');
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: true, trackingStatus: 'inactive' })
      ).toBe('awaiting_trip');
    });

    it('3. accepted + trackingStatus en_route -> en_route', () => {
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: true, trackingStatus: 'en_route' })
      ).toBe('en_route');
    });

    it('4. accepted + trackingStatus arrived -> arrived (can start service)', () => {
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: true, trackingStatus: 'arrived' })
      ).toBe('arrived');
    });

    it('5. a stale/stopped tracking doc while still accepted falls back to awaiting_trip, not a crash', () => {
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: true, trackingStatus: 'stopped' })
      ).toBe('awaiting_trip');
    });

    it('6. in_progress -> in_progress (can complete) regardless of tracking', () => {
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'in_progress', isHomeService: true, trackingStatus: 'arrived' })
      ).toBe('in_progress');
    });

    it('7. completed -> completed; cancelled/rejected while tracking was active still resolve to a terminal stage', () => {
      expect(getServiceWorkspaceStage({ bookingStatus: 'completed', isHomeService: true })).toBe('completed');
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'cancelled', isHomeService: true, trackingStatus: 'en_route' })
      ).toBe('terminal_other');
      expect(getServiceWorkspaceStage({ bookingStatus: 'rejected', isHomeService: true })).toBe('terminal_other');
    });
  });

  describe('on-the-spot', () => {
    it('8. accepted -> ready_to_start directly (no travel concept), regardless of any stray tracking data', () => {
      expect(getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: false })).toBe('ready_to_start');
      expect(
        getServiceWorkspaceStage({ bookingStatus: 'accepted', isHomeService: false, trackingStatus: 'en_route' })
      ).toBe('ready_to_start');
    });

    it('9. in_progress -> in_progress; completed -> completed', () => {
      expect(getServiceWorkspaceStage({ bookingStatus: 'in_progress', isHomeService: false })).toBe('in_progress');
      expect(getServiceWorkspaceStage({ bookingStatus: 'completed', isHomeService: false })).toBe('completed');
    });
  });
});
