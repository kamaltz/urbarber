/**
 * useAdminTickets Hook
 * Manages support tickets state
 */

import { useEffect, useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { SupportTicket, TicketReplyData } from '../types/admin';

export function useAdminTickets(adminId: string, status?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(adminId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      return;
    }

    let isMounted = true;
    const loadTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getSupportTickets(adminId, status);
        if (isMounted) setTickets(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTickets();
    return () => {
      isMounted = false;
    };
  }, [adminId, status]);

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.updateTicketStatus(adminId, ticketId, newStatus);

      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.ticketId === ticketId ? { ...t, status: newStatus as any } : t
          )
        );
      }

      return result;
    } catch {
      return { success: false, error: { message: 'Update failed' } };
    }
  };

  const replyToTicket = async (ticketId: string, data: TicketReplyData) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.replyToTicket(adminId, ticketId, data);
      return result;
    } catch {
      return { success: false, error: { message: 'Reply failed' } };
    }
  };

  const assignTicket = async (ticketId: string, assignToAdminId: string) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.assignTicket(adminId, ticketId, assignToAdminId);

      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.ticketId === ticketId ? { ...t, assignedTo: assignToAdminId } : t
          )
        );
      }

      return result;
    } catch {
      return { success: false, error: { message: 'Assign failed' } };
    }
  };

  const refresh = async () => {
    if (!adminId) return;

    try {
      setLoading(true);
      const data = await adminRepository.getSupportTickets(adminId, status);
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    tickets,
    loading,
    error,
    updateTicketStatus,
    replyToTicket,
    assignTicket,
    refresh,
  };
}
