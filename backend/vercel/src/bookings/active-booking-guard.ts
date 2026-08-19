import type { Firestore, Transaction } from 'firebase-admin/firestore';

/**
 * Payment-First booking-exclusivity invariant: a customer must not be able to
 * hold more than one active booking at a time. "Active" mirrors the canonical
 * BookingStatus enum (src/types/domain.ts) -- there is no en_route/arrived
 * *booking* status (those are bookingTracking-only states); a booking is
 * active for this purpose from creation (pending) through completion, and
 * stops being active the moment it reaches a final state.
 */
export const ACTIVE_BOOKING_STATUSES = ['pending', 'accepted', 'in_progress'] as const;

/** Thrown by assertNoActiveBooking when the customer already holds an active
 * booking. Callers map this to a 409 CUSTOMER_HAS_ACTIVE_BOOKING response. */
export class CustomerHasActiveBookingError extends Error {
  constructor(
    public readonly bookingId: string,
    public readonly status: string
  ) {
    super('CUSTOMER_HAS_ACTIVE_BOOKING');
  }
}

/**
 * Reads and validates booking exclusivity for `customerId` inside an existing
 * Firestore transaction. Must be called before any writes are queued on `t`
 * (Firestore transactions require all reads before any write), and before
 * acquireSlotLock's own read+write pair.
 *
 * Race-safety mirrors acquireSlotLock (slot-lock.ts): this function's query is
 * part of the transaction's read set, so if a concurrent transaction commits a
 * new active booking for the same customer between this read and this
 * transaction's commit, Firestore's optimistic concurrency control aborts and
 * retries this transaction -- on retry the query observes the just-committed
 * booking and correctly throws. No separate lock document is needed.
 */
export async function assertNoActiveBooking(t: Transaction, db: Firestore, customerId: string): Promise<void> {
  const activeSnap = await t.get(
    db
      .collection('bookings')
      .where('customerId', '==', customerId)
      .where('status', 'in', ACTIVE_BOOKING_STATUSES as unknown as string[])
      .limit(1)
  );

  if (!activeSnap.empty) {
    const doc = activeSnap.docs[0];
    const data = doc.data() || {};
    throw new CustomerHasActiveBookingError(doc.id, typeof data.status === 'string' ? data.status : 'unknown');
  }
}
