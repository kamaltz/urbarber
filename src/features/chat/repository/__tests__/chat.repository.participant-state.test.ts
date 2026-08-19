/**
 * Unit tests for chatRepository.archiveConversation/unarchiveConversation/
 * deleteConversation -- regression guard that these write ONLY to
 * participantState.<own uid>, matching what firestore.rules now allows (see
 * "Per-participant archive/delete state" on the conversations update rule).
 * A write that touches any other field/path would be denied in production
 * even though this mocked test wouldn't otherwise catch that.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateDocMock } = vi.hoisted(() => ({ updateDocMock: vi.fn().mockResolvedValue(undefined) }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  endBefore: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  increment: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: { currentUser: { uid: 'cust-1', getIdToken: vi.fn() } },
}));

import { chatRepository } from '../chat.repository';

describe('chatRepository participant chat state (archive/unarchive/delete)', () => {
  beforeEach(() => {
    updateDocMock.mockClear();
  });

  it('archiveConversation writes only participantState.<own uid>.archived (and updatedAt)', async () => {
    await chatRepository.archiveConversation('booking-1');

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const payload = updateDocMock.mock.calls[0][1];
    expect(Object.keys(payload).sort()).toEqual(['participantState.cust-1.archived', 'participantState.cust-1.updatedAt']);
    expect(payload['participantState.cust-1.archived']).toBe(true);
  });

  it('unarchiveConversation sets archived: false for the own uid only', async () => {
    await chatRepository.unarchiveConversation('booking-1');

    const payload = updateDocMock.mock.calls[0][1];
    expect(payload['participantState.cust-1.archived']).toBe(false);
    expect(payload).not.toHaveProperty('participantState.cust-1.deleted');
  });

  it('deleteConversation writes only participantState.<own uid>.deleted (and updatedAt), never touching messages or other conversation fields', async () => {
    await chatRepository.deleteConversation('booking-1');

    const payload = updateDocMock.mock.calls[0][1];
    expect(Object.keys(payload).sort()).toEqual(['participantState.cust-1.deleted', 'participantState.cust-1.updatedAt']);
    expect(payload['participantState.cust-1.deleted']).toBe(true);
  });

  it('never writes to the other participant\'s participantState key', async () => {
    await chatRepository.archiveConversation('booking-1');
    await chatRepository.deleteConversation('booking-1');

    for (const call of updateDocMock.mock.calls) {
      const keys = Object.keys(call[1]);
      expect(keys.every((k) => k.startsWith('participantState.cust-1.'))).toBe(true);
    }
  });
});
