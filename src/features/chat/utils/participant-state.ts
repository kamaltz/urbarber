import { Conversation } from '../types';

/** Reads the CURRENT user's own archive/delete state for a conversation,
 * defaulting to {archived: false, deleted: false} for conversations created
 * before participantState existed, or for a participant with no entry yet. */
export function getOwnChatState(conversation: Conversation, uid: string): { archived: boolean; deleted: boolean } {
  const entry = conversation.participantState?.[uid];
  return { archived: entry?.archived ?? false, deleted: entry?.deleted ?? false };
}
