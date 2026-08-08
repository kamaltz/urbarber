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

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) {
      if (isMountedRef.current) {
        setError('Not authenticated');
        setLoading(false);
      }
      return;
    }

    const unsubscribe = chatRepository.subscribeToConversations(
      userId,
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
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [role]);

  return {
    conversations,
    loading,
    error,
  };
}
