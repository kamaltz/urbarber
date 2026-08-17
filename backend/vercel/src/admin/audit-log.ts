/**
 * Generic admin audit log writer for actions that don't fit the
 * targetUserId/previousStatus/newStatus shape barber-account-management.ts's
 * logAdminAction uses (barber suspend/reactivate/delete). Same
 * adminAuditLogs collection, a more general event shape.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebase-admin.js';

export type AdminAuditAction =
  | 'PRICING_SETTINGS_UPDATED'
  | 'VOUCHER_CREATED'
  | 'VOUCHER_UPDATED'
  | 'VOUCHER_ACTIVATED'
  | 'VOUCHER_DISABLED';

export async function logAdminEvent(
  adminId: string,
  action: AdminAuditAction,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await db.collection('adminAuditLogs').add({
      adminId,
      action,
      targetId,
      details: details ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    // Never let audit-log failure block the actual admin operation.
    console.error('[AuditLog] Failed to log action:', err.message);
  }
}
