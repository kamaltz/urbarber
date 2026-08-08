/**
 * Admin API Service (Client-Side)
 * Communicates with the trusted Vercel backend for admin operations.
 * Screens must NOT call Firebase or Supabase directly for admin mutations.
 */

import { firebaseAuth } from '@/lib/firebase';
import type {
  AdminBarberRegistration,
  AdminBarberRegistrationDetail,
  AdminBookingRecord,
  AdminUserRecord,
  DashboardMetrics,
} from '../types/admin';

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

async function getAuthToken(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Sesi admin tidak valid. Silakan login kembali.');
  return user.getIdToken(false);
}

async function adminPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request gagal (${response.status})`);
  }
  return json as T;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await adminPost<{ data: DashboardMetrics }>('/api/admin/dashboard', {});
  return res.data;
}

// ─── Barber Registrations ─────────────────────────────────────────────────────

export async function fetchBarberRegistrations(
  verificationStatus?: 'pending' | 'approved' | 'rejected',
  limit = 50,
): Promise<AdminBarberRegistration[]> {
  const res = await adminPost<{ data: AdminBarberRegistration[] }>(
    '/api/admin/barber-registrations/list',
    { verificationStatus, limit },
  );
  return res.data;
}

export async function fetchBarberRegistrationDetail(
  barberId: string,
): Promise<AdminBarberRegistrationDetail> {
  const res = await adminPost<{ data: AdminBarberRegistrationDetail }>(
    '/api/admin/barber-registrations/detail',
    { barberId },
  );
  return res.data;
}

export async function approveBarberRegistration(barberId: string): Promise<{
  success: boolean;
  alreadyApproved: boolean;
  message: string;
}> {
  return adminPost('/api/admin/barber-registrations/approve', { barberId });
}

export async function rejectBarberRegistration(
  barberId: string,
  reason: string,
): Promise<{ success: boolean; alreadyRejected: boolean; message: string }> {
  return adminPost('/api/admin/barber-registrations/reject', { barberId, reason });
}

export async function fetchPrivateDocumentUrl(
  barberId: string,
  documentType: string,
): Promise<{ url: string; expiresAt: string }> {
  return adminPost('/api/admin/barber-registrations/document-url', { barberId, documentType });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function fetchAdminUsers(
  role?: string,
  status?: string,
  limit = 50,
): Promise<AdminUserRecord[]> {
  const res = await adminPost<{ data: AdminUserRecord[] }>(
    '/api/admin/users/list',
    { role, status, limit },
  );
  return res.data;
}

export async function updateUserStatus(
  userId: string,
  targetStatus: 'active' | 'suspended',
  reason?: string,
): Promise<{ success: boolean; idempotent: boolean; message: string }> {
  return adminPost('/api/admin/users/status', { userId, targetStatus, reason: reason ?? '' });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function fetchAdminBookings(
  status?: string,
  limit = 50,
): Promise<AdminBookingRecord[]> {
  const res = await adminPost<{ data: AdminBookingRecord[] }>(
    '/api/admin/bookings/list',
    { status, limit },
  );
  return res.data;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(data: {
  name: string;
  description?: string;
  icon?: string;
  order?: number;
}): Promise<{ success: boolean; id: string; message: string }> {
  return adminPost('/api/admin/categories/create', data);
}

export async function updateCategory(data: {
  categoryId: string;
  name?: string;
  description?: string;
  icon?: string;
  active?: boolean;
  order?: number;
}): Promise<{ success: boolean; message: string }> {
  return adminPost('/api/admin/categories/update', data);
}
