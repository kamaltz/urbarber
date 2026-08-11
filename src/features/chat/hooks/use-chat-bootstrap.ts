/**
 * Batch 10B-5G: initializes conversations/{bookingId} through the trusted
 * backend (POST /api/bookings/:bookingId/chat) before a chat room subscribes
 * to it. The endpoint is payment-gated and idempotent -- calling it again
 * once the conversation already exists just returns it -- so chat room
 * screens can call this defensively even when the booking-detail screen's
 * Chat button already called ensureConversation first (e.g. a direct deep
 * link into the room).
 */
import { useEffect, useRef, useState } from 'react';
import { chatRepository } from '../repository/chat.repository';

interface BootstrapState {
  bookingId: string;
  ready: boolean;
  error: string | null;
}

const INITIAL_STATE: BootstrapState = { bookingId: '', ready: false, error: null };

export function useChatBootstrap(bookingId: string) {
  // Keyed by bookingId rather than reset via a synchronous setState at the top
  // of the effect -- state only changes inside the async ensureConversation
  // callbacks below, and `ready`/`error` are derived by comparing state.bookingId
  // against the current bookingId so a stale result from a previous id can
  // never leak through if bookingId changes while this stays mounted.
  const [state, setState] = useState<BootstrapState>(INITIAL_STATE);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!bookingId) {
      return;
    }

    chatRepository
      .ensureConversation(bookingId)
      .then(() => {
        if (isMountedRef.current) setState({ bookingId, ready: true, error: null });
      })
      .catch((err: any) => {
        if (isMountedRef.current) {
          setState({ bookingId, ready: false, error: err?.message || 'Gagal membuka percakapan.' });
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [bookingId]);

  const isCurrent = state.bookingId === bookingId;
  return { ready: isCurrent && state.ready, error: isCurrent ? state.error : null };
}
