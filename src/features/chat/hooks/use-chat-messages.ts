import { DocumentSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { chatRepository } from '../repository/chat.repository';
import type { Message } from '../types';

export function useChatMessages(bookingId: string, enabled: boolean = true) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oldestDocRef, setOldestDocRef] = useState<DocumentSnapshot | undefined>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Batch 10B-5G: the parent conversations/{bookingId} document must exist
    // before this subscribes, or Firestore rules deny the read (the parent
    // doc lookup inside the rule has nothing to check participants against).
    // `enabled` stays false until useChatBootstrap confirms ensureConversation
    // succeeded, so this never subscribes to a conversation that was never
    // created.
    if (!enabled || !bookingId) {
      return;
    }

    const unsubscribe = chatRepository.subscribeToMessages(
      bookingId,
      (msgs, oldestRef) => {
        if (isMountedRef.current) {
          setMessages(msgs);
          setOldestDocRef(oldestRef);
          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load messages');
          setLoading(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [bookingId, enabled]);

  const send = async (text: string) => {
    try {
      setError(null);
      await chatRepository.sendMessage(bookingId, text);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send message';
      if (isMountedRef.current) setError(errorMsg);
      throw err;
    }
  };

  const loadOlder = async () => {
    if (!oldestDocRef) {
      return { messages: [] };
    }

    try {
      setError(null);
      const result = await chatRepository.loadOlderMessages(bookingId, oldestDocRef);
      if (isMountedRef.current) {
        setMessages((prev) => [...result.messages, ...prev]);
        setOldestDocRef(result.oldestRef);
      }
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load older messages';
      if (isMountedRef.current) setError(errorMsg);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    send,
    loadOlder,
    hasOlder: !!oldestDocRef,
  };
}
