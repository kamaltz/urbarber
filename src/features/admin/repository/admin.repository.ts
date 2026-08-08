/**
 * Admin Repository (Client-Side Firestore Reads)
 * Provides read-only access to admin-accessible Firestore data.
 *
 * RULES:
 * - This repository is READ-ONLY from the client.
 * - All state mutations go through src/features/admin/services/admin.service.ts
 *   which proxies to the trusted Vercel backend.
 * - Never write barberRegistrations.verificationStatus, users.status,
 *   or reviewedBy from this module.
 */

import { firestore } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type {
  AdminBarberRecord,
  AdminBarberRegistration,
  AdminBookingRecord,
  AdminUserRecord,
  CategoryRecord,
  SystemUser,
} from '../types/admin';

// ─── Barber Registrations ─────────────────────────────────────────────────────

export const adminRepository = {

  async getBarberRegistrations(
    verificationStatus?: string,
    limitCount = 50,
  ): Promise<AdminBarberRegistration[]> {
    try {
      const colRef = collection(firestore, 'barberRegistrations');
      let q;
      if (verificationStatus) {
        q = query(colRef, where('verificationStatus', '==', verificationStatus), orderBy('submittedAt', 'desc'), limit(limitCount));
      } else {
        q = query(colRef, orderBy('submittedAt', 'desc'), limit(limitCount));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        barberId: d.id,
        ownerName: d.data().ownerName ?? '',
        businessName: d.data().businessName ?? '',
        phoneNumber: d.data().phoneNumber,
        businessAddress: d.data().businessAddress,
        serviceArea: d.data().serviceArea,
        verificationStatus: d.data().verificationStatus,
        onboardingStatus: d.data().onboardingStatus,
        submittedAt: d.data().submittedAt ?? null,
        reviewedAt: d.data().reviewedAt ?? null,
        reviewedBy: d.data().reviewedBy ?? null,
        rejectionReason: d.data().rejectionReason ?? null,
      }));
    } catch (error) {
      console.warn('[AdminRepository getBarberRegistrations Error]', error);
      return [];
    }
  },

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUsers(role?: string, status?: string, limitCount = 50): Promise<AdminUserRecord[]> {
    try {
      const colRef = collection(firestore, 'users');
      let q;
      if (role && status) {
        q = query(colRef, where('role', '==', role), where('status', '==', status), orderBy('createdAt', 'desc'), limit(limitCount));
      } else if (role) {
        q = query(colRef, where('role', '==', role), orderBy('createdAt', 'desc'), limit(limitCount));
      } else if (status) {
        q = query(colRef, where('status', '==', status), orderBy('createdAt', 'desc'), limit(limitCount));
      } else {
        q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        uid: d.id,
        email: d.data().email ?? '',
        name: d.data().name ?? '',
        role: d.data().role,
        status: d.data().status,
        phoneNumber: d.data().phoneNumber,
        createdAt: d.data().createdAt ?? null,
      }));
    } catch (error) {
      console.warn('[AdminRepository getUsers Error]', error);
      return [];
    }
  },

  async getUserDetail(userId: string): Promise<AdminUserRecord | null> {
    try {
      const snap = await getDoc(doc(firestore, 'users', userId));
      if (!snap.exists()) return null;
      return {
        uid: snap.id,
        email: snap.data().email ?? '',
        name: snap.data().name ?? '',
        role: snap.data().role,
        status: snap.data().status,
        phoneNumber: snap.data().phoneNumber,
        createdAt: snap.data().createdAt ?? null,
      };
    } catch (error) {
      console.warn('[AdminRepository getUserDetail Error]', error);
      return null;
    }
  },

  // ─── Barbers ───────────────────────────────────────────────────────────────

  async getBarbers(verificationStatus?: string, limitCount = 50): Promise<AdminBarberRecord[]> {
    try {
      const colRef = collection(firestore, 'barbers');
      let q;
      if (verificationStatus) {
        q = query(colRef, where('verificationStatus', '==', verificationStatus), orderBy('createdAt', 'desc'), limit(limitCount));
      } else {
        q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        displayName: d.data().displayName ?? d.data().ownerName ?? '',
        businessName: d.data().businessName,
        verificationStatus: d.data().verificationStatus,
        listingStatus: d.data().listingStatus,
        status: d.data().status,
        acceptingNewBookings: d.data().acceptingNewBookings,
        ratingAverage: d.data().ratingAverage,
        reviewCount: d.data().reviewCount,
        approvedAt: d.data().approvedAt ?? null,
        createdAt: d.data().createdAt ?? null,
      }));
    } catch (error) {
      console.warn('[AdminRepository getBarbers Error]', error);
      return [];
    }
  },

  async getBarberDetail(barberId: string): Promise<AdminBarberRecord | null> {
    try {
      const snap = await getDoc(doc(firestore, 'barbers', barberId));
      if (!snap.exists()) return null;
      return {
        id: snap.id,
        displayName: snap.data().displayName ?? snap.data().ownerName ?? '',
        businessName: snap.data().businessName,
        verificationStatus: snap.data().verificationStatus,
        listingStatus: snap.data().listingStatus,
        status: snap.data().status,
        acceptingNewBookings: snap.data().acceptingNewBookings,
        ratingAverage: snap.data().ratingAverage,
        reviewCount: snap.data().reviewCount,
        approvedAt: snap.data().approvedAt ?? null,
        createdAt: snap.data().createdAt ?? null,
      };
    } catch (error) {
      console.warn('[AdminRepository getBarberDetail Error]', error);
      return null;
    }
  },

  // ─── Bookings ──────────────────────────────────────────────────────────────

  async getBookings(status?: string, limitCount = 50): Promise<AdminBookingRecord[]> {
    try {
      const colRef = collection(firestore, 'bookings');
      let q;
      if (status) {
        q = query(colRef, where('status', '==', status), orderBy('createdAt', 'desc'), limit(limitCount));
      } else {
        q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        customerId: d.data().customerId,
        barberId: d.data().barberId,
        status: d.data().status,
        paymentMethod: d.data().paymentMethod,
        paymentStatus: d.data().paymentStatus,
        totalPrice: d.data().totalPrice ?? 0,
        date: d.data().date ?? '',
        startTime: d.data().startTime ?? '',
        createdAt: d.data().createdAt ?? null,
      }));
    } catch (error) {
      console.warn('[AdminRepository getBookings Error]', error);
      return [];
    }
  },

  async getBookingDetail(bookingId: string): Promise<AdminBookingRecord | null> {
    try {
      const snap = await getDoc(doc(firestore, 'bookings', bookingId));
      if (!snap.exists()) return null;
      return {
        id: snap.id,
        customerId: snap.data().customerId,
        barberId: snap.data().barberId,
        status: snap.data().status,
        paymentMethod: snap.data().paymentMethod,
        paymentStatus: snap.data().paymentStatus,
        totalPrice: snap.data().totalPrice ?? 0,
        date: snap.data().date ?? '',
        startTime: snap.data().startTime ?? '',
        createdAt: snap.data().createdAt ?? null,
      };
    } catch (error) {
      console.warn('[AdminRepository getBookingDetail Error]', error);
      return null;
    }
  },

  // ─── Categories ────────────────────────────────────────────────────────────

  async getCategories(activeOnly = false): Promise<CategoryRecord[]> {
    try {
      const colRef = collection(firestore, 'categories');
      const q = activeOnly
        ? query(colRef, where('active', '==', true), orderBy('order', 'asc'))
        : query(colRef, orderBy('order', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? '',
        description: d.data().description ?? null,
        icon: d.data().icon ?? null,
        active: d.data().active ?? true,
        order: d.data().order ?? 0,
        createdAt: d.data().createdAt ?? null,
      }));
    } catch (error) {
      console.warn('[AdminRepository getCategories Error]', error);
      return [];
    }
  },

  // ─── Legacy support (keep for existing hooks that use old signatures) ────────

  /** @deprecated Use getUsers */
  async getSystemUsers(adminId: string, role?: string, status?: string): Promise<SystemUser[]> {
    const rawUsers = await this.getUsers(role, status);
    return rawUsers.map((u) => ({
      userId: u.uid,
      name: u.name,
      email: u.email,
      phone: u.phoneNumber,
      userRole: u.role,
      status: u.status,
      joinedAt: u.createdAt ? new Date(u.createdAt.seconds * 1000).toISOString() : '',
      verificationStatus: 'approved',
    }));
  },

  /** @deprecated Use getUsers */
  async getUserManagementSummary(_adminId: string) {
    return {
      totalCustomers: 0, activeCustomers: 0, suspendedCustomers: 0,
      totalBarbers: 0, activeBarbers: 0, suspendedBarbers: 0, unverifiedCount: 0,
    };
  },

  /** @deprecated Use admin.service updateUserStatus via Vercel backend */
  async updateUserStatus(_adminId: string, _userId: string, _newStatus: string) {
    return { success: false, error: { message: 'Gunakan admin.service.updateUserStatus melalui Vercel backend.' } };
  },

  /** @deprecated */
  async verifyUser(_adminId: string, _data: any) {
    return { success: false, error: { message: 'Gunakan admin.service untuk operasi ini.' } };
  },

  /** @deprecated */
  async getAdminAnalytics(_adminId: string, _period?: string) {
    return null;
  },

  /** @deprecated */
  async getSystemHealth(_adminId: string) {
    return null;
  },

  /** @deprecated */
  async getBookingsForVerification(_adminId: string, _status?: string) {
    return [];
  },

  /** @deprecated */
  async updateBookingFlag(_adminId: string, _data: any) {
    return { success: false };
  },

  /** @deprecated */
  async getAdminDashboard(_adminId: string) {
    return null;
  },

  /** @deprecated */
  async getReviewsForModeration(_adminId: string, _status?: string) {
    return [];
  },

  /** @deprecated */
  async moderateReview(_adminId: string, _data: any) {
    return { success: false };
  },

  /** @deprecated */
  async getSupportTickets(_adminId: string, _status?: string) {
    return [];
  },

  /** @deprecated */
  async updateTicketStatus(_adminId: string, _ticketId: string, _newStatus: string) {
    return { success: false };
  },

  /** @deprecated */
  async replyToTicket(_adminId: string, _ticketId: string, _data: any) {
    return { success: false };
  },

  /** @deprecated */
  async assignTicket(_adminId: string, _ticketId: string, _assignToAdminId: string) {
    return { success: false };
  },
};
