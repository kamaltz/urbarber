import { firebaseAuth } from '@/lib/firebase';
import { useEffect, useRef, useState } from 'react';
import { chatRepository } from '../repository/chat.repository';
import type { Conversation } from '../types';

export function useChatConversations(role: 'customer' | 'barber') {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribeAuth = firebaseAuth.onAuthStateChanged((user) => {
      if (!isMountedRef.current) return;
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        setConversations([]);
        return;
      }

      const unsubscribeConvs = chatRepository.subscribeToConversations(
        user.uid,
        role,
        (convs) => {
          if (isMountedRef.current) {
            setConversations(convs);
            setLoading(false);
            setError(null);
          }
        },
        (err) => {
          if (isMountedRef.current) {
            setError(err.message || 'Failed to load conversations');
            setLoading(false);
          }
        }
      );

      return () => {
        unsubscribeConvs();
      };
    });

    return () => {
      isMountedRef.current = false;
      unsubscribeAuth();
    };
  }, [role]);

  return {
    conversations,
    loading,
    error,
  };
}
