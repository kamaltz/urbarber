import { Timestamp } from 'firebase/firestore';

export type ConversationStatus = 'active' | 'closed';

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
}

export type MessageInput = Omit<Message, 'id' | 'createdAt'>;
