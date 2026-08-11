import { firebaseAuth } from '@/lib/firebase';
import {
    collection,
    doc,
    DocumentSnapshot,
    endBefore,
    getDocs, getFirestore, increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { Conversation, Message } from '../types';

const db = getFirestore();

const MESSAGES_LIMIT = 30;
const MAX_MESSAGE_LENGTH = 1000;
// Batch 10B-5G: this previously read EXPO_PUBLIC_API_BASE_URL, which is never
// set anywhere (.env.local only defines EXPO_PUBLIC_PAYMENT_API_BASE_URL) --
// every other backend client (payment-api.service.ts, barber-api.service.ts,
// availability-api.service.ts, account-bootstrap.service.ts) already targets
// the same trusted Vercel deployment via EXPO_PUBLIC_PAYMENT_API_BASE_URL.
const API_BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export const chatRepository = {
  /**
   * Initialize or get a conversation for a booking.
   * Must validate payment status via trusted backend.
   */
  async ensureConversation(bookingId: string): Promise<string> {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const url = `${API_BASE_URL}/api/bookings/${bookingId}/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to initialize chat');
      }

      const { conversationId } = await response.json();
      return conversationId;
    } catch (err: any) {
      console.error('[chatRepository] ensureConversation error:', err);
      throw err;
    }
  },

  /**
   * Subscribe to conversations for current user.
   * Returns unsubscribe function.
   */
  subscribeToConversations(
    userId: string,
    role: 'customer' | 'barber',
    callback: (conversations: Conversation[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const field = role === 'customer' ? 'customerId' : 'barberId';

    try {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'conversations'),
          where(field, '==', userId),
          orderBy('updatedAt', 'desc')
        ),
        (snapshot) => {
          const conversations = snapshot.docs.map((doc) => ({
            ...(doc.data() as any),
            id: doc.id,
          })) as Conversation[];
          callback(conversations);
        },
        (error) => {
          console.error('[chatRepository] subscribeToConversations error:', error);
          onError?.(error as Error);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.error('[chatRepository] subscribeToConversations setup error:', err);
      throw err;
    }
  },

  /**
   * Subscribe to messages for a conversation.
   * Initial load: latest 30 messages.
   * Returns unsubscribe function.
   */
  subscribeToMessages(
    bookingId: string,
    callback: (messages: Message[], oldestDocRef?: DocumentSnapshot) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'conversations', bookingId, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(MESSAGES_LIMIT)
        ),
        (snapshot) => {
          const messages = snapshot.docs
            .map((doc) => ({
              ...(doc.data() as any),
              id: doc.id,
            }))
            .reverse() as Message[]; // Chronological order

          const oldestDoc =
            snapshot.docs.length > 0
              ? snapshot.docs[snapshot.docs.length - 1]
              : undefined;

          callback(messages, oldestDoc);
        },
        (error) => {
          console.error('[chatRepository] subscribeToMessages error:', error);
          onError?.(error as Error);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.error('[chatRepository] subscribeToMessages setup error:', err);
      throw err;
    }
  },

  /**
   * Send a message to a conversation.
   * Increments recipient's unread count atomically.
   */
  async sendMessage(bookingId: string, text: string): Promise<void> {
    const trimmed = text.trim();

    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `Message must be 1-${MAX_MESSAGE_LENGTH} characters (non-whitespace)`
      );
    }

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    try {
      await runTransaction(db, async (transaction) => {
        // Get conversation to check it exists and get participant info
        const convRef = doc(db, 'conversations', bookingId);
        const convSnap = await transaction.get(convRef);

        if (!convSnap.exists()) {
          throw new Error('Conversation not found');
        }

        const convData = convSnap.data() as any;
        const isSenderCustomer = convData.customerId === userId;

        // Verify sender is a participant
        if (!convData.participants.includes(userId)) {
          throw new Error('User is not a participant');
        }

        // Check conversation is active
        if (convData.status !== 'active') {
          throw new Error('Conversation is closed (read-only)');
        }

        // Create message
        const messageRef = doc(
          collection(db, 'conversations', bookingId, 'messages')
        );

        transaction.set(messageRef, {
          senderId: userId,
          text: trimmed,
          type: 'text',
          createdAt: serverTimestamp(),
        });

        // Update conversation metadata
        const updateData: Record<string, any> = {
          lastMessage: trimmed.substring(0, 100),
          lastMessageAt: serverTimestamp(),
          lastSenderId: userId,
          updatedAt: serverTimestamp(),
        };

        // Increment recipient's unread count
        if (isSenderCustomer) {
          updateData.barberUnreadCount = increment(1);
        } else {
          updateData.customerUnreadCount = increment(1);
        }

        transaction.update(convRef, updateData);
      });
    } catch (err: any) {
      console.error('[chatRepository] sendMessage error:', err);
      throw err;
    }
  },

  /**
   * Reset unread count for current user.
   * Only the specified role can reset their own unread count.
   */
  async resetUnreadCount(
    bookingId: string,
    role: 'customer' | 'barber'
  ): Promise<void> {
    const field =
      role === 'customer' ? 'customerUnreadCount' : 'barberUnreadCount';

    try {
      await updateDoc(doc(db, 'conversations', bookingId), {
        [field]: 0,
      });
    } catch (err: any) {
      console.error('[chatRepository] resetUnreadCount error:', err);
      throw err;
    }
  },

  /**
   * Load older messages (pagination).
   * Requires oldestDocSnapshot from a previous query.
   */
  async loadOlderMessages(
    bookingId: string,
    oldestDocSnapshot: DocumentSnapshot
  ): Promise<{ messages: Message[]; oldestRef?: DocumentSnapshot }> {
    try {
      const older = await getDocs(
        query(
          collection(db, 'conversations', bookingId, 'messages'),
          orderBy('createdAt', 'desc'),
          endBefore(oldestDocSnapshot),
          limit(20)
        )
      );

      const messages = older.docs
        .map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }))
        .reverse() as Message[];

      const newOldestRef =
        older.docs.length > 0 ? older.docs[older.docs.length - 1] : undefined;

      return {
        messages,
        oldestRef: newOldestRef,
      };
    } catch (err: any) {
      console.error('[chatRepository] loadOlderMessages error:', err);
      throw err;
    }
  },
};
