import { describe, expect, it } from 'vitest';
import { getOwnChatState } from '../participant-state';
import type { Conversation } from '../../types';

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    bookingId: 'conv-1',
    customerId: 'cust-1',
    barberId: 'barb-1',
    participants: ['cust-1', 'barb-1'],
    status: 'active',
    customerUnreadCount: 0,
    barberUnreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('getOwnChatState', () => {
  it('defaults to {archived: false, deleted: false} when participantState is entirely absent (pre-migration conversation)', () => {
    expect(getOwnChatState(conversation(), 'cust-1')).toEqual({ archived: false, deleted: false });
  });

  it('defaults to {archived: false, deleted: false} when participantState exists but has no entry for this uid', () => {
    const conv = conversation({ participantState: { 'barb-1': { archived: true, deleted: false, updatedAt: '2026-01-01' } } });
    expect(getOwnChatState(conv, 'cust-1')).toEqual({ archived: false, deleted: false });
  });

  it("reads the caller's own entry, never the other participant's", () => {
    const conv = conversation({
      participantState: {
        'cust-1': { archived: true, deleted: false, updatedAt: '2026-01-02' },
        'barb-1': { archived: false, deleted: true, updatedAt: '2026-01-02' },
      },
    });
    expect(getOwnChatState(conv, 'cust-1')).toEqual({ archived: true, deleted: false });
    expect(getOwnChatState(conv, 'barb-1')).toEqual({ archived: false, deleted: true });
  });
});
