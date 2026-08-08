import { DocumentSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { chatRepository } from '../repository/chat.repository';
import type { Message } from '../types';

export function useChatMessages(bookingId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oldestDocRef, setOldestDocRef] = useState<DocumentSnapshot | undefined>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

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
  }, [bookingId]);

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
