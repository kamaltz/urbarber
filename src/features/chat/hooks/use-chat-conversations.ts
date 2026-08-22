import { firebaseAuth } from '@/lib/firebase';
import { useEffect, useRef, useState } from 'react';
import { chatRepository } from '../repository/chat.repository';
import type { Conversation } from '../types';
import { subscribeConversationsForAuth } from '../utils/subscribe-conversations-for-auth';

export function useChatConversations(role: 'customer' | 'barber') {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = subscribeConversationsForAuth(
      {
        onAuthStateChanged: (cb) => firebaseAuth.onAuthStateChanged(cb),
        subscribeToConversations: (uid, r, onNext, onError) =>
          chatRepository.subscribeToConversations(uid, r, onNext as (c: Conversation[]) => void, onError),
      },
      role,
      (convs) => {
        if (isMountedRef.current) {
          setConversations(convs as Conversation[]);
          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load conversations');
          setLoading(false);
        }
      },
      () => {
        if (isMountedRef.current) {
          setError('Not authenticated');
          setLoading(false);
          setConversations([]);
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
