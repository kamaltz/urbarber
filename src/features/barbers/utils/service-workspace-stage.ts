/**
 * Single source of truth for which stage the Service Workspace screen is in,
 * and therefore which primary action (if any) is valid to show. Pure
 * function of (bookingStatus, isHomeService, trackingStatus) so it's
 * unit-testable without rendering anything, and so the UI can never show an
 * action that doesn't match real backend/Firestore state (booking status and
 * tracking status are read from the same realtime subscriptions the rest of
 * the screen uses).
 *
 * This only decides what to SHOW -- it is not itself a security boundary.
 * The backend independently re-validates every transition
 * (POST /api/barber/bookings/respond, POST /api/barber/bookings/status,
 * firestore.rules for bookingTracking) regardless of what this returns.
 */
import type { BookingStatus } from '@/types/domain';
import type { TrackingStatus } from '@/features/location/services/tracking.model';

export type ServiceWorkspaceStage =
  | 'requires_response' // pending -- accept/reject
  | 'awaiting_trip' // accepted, Home Service, travel not yet started
  | 'en_route' // accepted, Home Service, traveling
  | 'arrived' // accepted, Home Service, arrived -- can start service
  | 'ready_to_start' // accepted, on-the-spot -- no travel concept, can start directly
  | 'in_progress' // service underway -- can complete
  | 'completed'
  | 'terminal_other'; // rejected / cancelled

export function getServiceWorkspaceStage(params: {
  bookingStatus: BookingStatus;
  isHomeService: boolean;
  trackingStatus?: TrackingStatus | null;
}): ServiceWorkspaceStage {
  const { bookingStatus, isHomeService, trackingStatus } = params;

  if (bookingStatus === 'pending') return 'requires_response';
  if (bookingStatus === 'completed') return 'completed';
  if (bookingStatus === 'rejected' || bookingStatus === 'cancelled') return 'terminal_other';
  if (bookingStatus === 'in_progress') return 'in_progress';

  // bookingStatus === 'accepted' from here on.
  if (!isHomeService) return 'ready_to_start';

  if (trackingStatus === 'arrived') return 'arrived';
  if (trackingStatus === 'en_route') return 'en_route';
  // undefined / 'inactive' / 'stopped' (a stale doc from a prior attempt) --
  // travel hasn't (successfully) started yet.
  return 'awaiting_trip';
}
