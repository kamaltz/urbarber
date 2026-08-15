import type { DocumentReference, Transaction } from 'firebase-admin/firestore';

export function getSlotLockId(barberId: string, date: string, startTime: string): string {
  const cleanDate = (date || '').trim();
  const cleanTime = (startTime || '').replace(':', '').trim();
  return `${barberId}_${cleanDate}_${cleanTime}`;
}

/** Thrown by acquireSlotLock when barberId+date+startTime is already held -- by a
 * finalized (paid) booking, or by a still-live temporary hold belonging to a
 * different customer. Callers map this to a 409 SLOT_NOT_AVAILABLE response. */
export class SlotNotAvailableError extends Error {}

/**
 * Reads, validates, and claims the slot lock for barberId+date+startTime inside an
 * existing Firestore transaction. Must be called before any writes are queued on
 * `t` (Firestore transactions require all reads before any write).
 *
 * P0-1 (CRITICAL slot ownership race -- see FINAL_THESIS_READINESS_AUDIT.md):
 * previously, slot-lock acquisition in api/payments.ts was a plain get() then a
 * separate set(), so two concurrent requests for the identical slot could both
 * observe it as available before either write committed, producing two
 * independently payable bookings for one slot. Running the read+validate+write here
 * inside the caller's db.runTransaction closes that race: Firestore's optimistic
 * concurrency control aborts and retries whichever transaction commits second, so on
 * retry it observes the lock the first transaction just wrote and this function
 * correctly throws.
 *
 * Extracted as a standalone function (mirroring reconcile-transaction.ts's
 * reconcilePaymentTransaction) so the concurrency property is directly testable
 * against the Firestore emulator with Promise.all, without needing to exercise the
 * full HTTP handler / Midtrans integration.
 */
export async function acquireSlotLock(
  t: Transaction,
  slotLockRef: DocumentReference,
  params: { barberId: string; date: string; startTime: string; customerId: string }
): Promise<void> {
  const { barberId, date, startTime, customerId } = params;
  const lockSnap = await t.get(slotLockRef);
  const lockData = lockSnap.exists ? lockSnap.data() || {} : null;

  if (lockData) {
    // A finalized lock belongs to an already-paid, final booking for this exact
    // slot -- it must never be reassigned to a new booking attempt, regardless of
    // customer or hold expiry (finalized locks don't expire; they're only ever
    // released by reconcilePaymentTransaction's releaseSlot path when that paid
    // booking itself is cancelled/rejected).
    if (lockData.status === 'finalized') {
      throw new SlotNotAvailableError();
    }

    const isExpired = lockData.expiresAt ? new Date(lockData.expiresAt).getTime() <= Date.now() : false;

    // A live (non-expired) temporary hold owned by a different customer blocks
    // this attempt. An expired hold, or one owned by the same customer retrying,
    // may be reclaimed.
    if (!isExpired && lockData.customerId !== customerId) {
      throw new SlotNotAvailableError();
    }
  }

  const timestamp = new Date().toISOString();
  t.set(slotLockRef, {
    barberId,
    date,
    startTime,
    customerId,
    createdAt: timestamp,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
  });
}
