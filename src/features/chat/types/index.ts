import { Timestamp } from 'firebase/firestore';

export type ConversationStatus = 'active' | 'closed';

export interface ParticipantChatState {
  archived: boolean;
  deleted: boolean;
  updatedAt: Timestamp | Date | string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  type: 'text';
  createdAt: Timestamp | Date;
}

export interface Conversation {
  id: string; // bookingId
  bookingId: string;
  customerId: string;
  barberId: string;
  participants: string[];
  status: ConversationStatus;
  lastMessage?: string;
  lastMessageAt?: Timestamp | Date;
  lastSenderId?: string;
  customerUnreadCount: number;
  barberUnreadCount: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  /** Per-participant archive/delete state, keyed by uid. Absent on
   * conversations created before this field existed -- callers must treat a
   * missing entry (or a missing participantState map entirely) as
   * {archived: false, deleted: false}. */
  participantState?: Record<string, ParticipantChatState>;
}

export type MessageInput = Omit<Message, 'id' | 'createdAt'>;
