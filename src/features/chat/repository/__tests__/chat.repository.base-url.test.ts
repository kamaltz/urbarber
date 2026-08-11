/**
 * Unit Tests for chatRepository's API base URL (Batch 10B-5G)
 *
 * Regression guard: ensureConversation previously read
 * `process.env.EXPO_PUBLIC_API_BASE_URL`, a variable never defined anywhere
 * in .env.local -- every other backend client (payment-api.service.ts,
 * barber-api.service.ts, availability-api.service.ts,
 * account-bootstrap.service.ts) already targets
 * EXPO_PUBLIC_PAYMENT_API_BASE_URL. The undefined base meant every
 * ensureConversation request actually hit the literal URL
 * "undefined/api/bookings/{id}/chat", which is what the live
 * "Missing or insufficient permissions" failure traced back to (the chat
 * room subscribed to a conversation that bootstrap never actually reached
 * the backend to create).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
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
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('fake-id-token') } },
}));

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

describe('chatRepository.ensureConversation base URL resolution', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversationId: 'booking-1' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('1. uses EXPO_PUBLIC_PAYMENT_API_BASE_URL (the same base every other backend client uses), not EXPO_PUBLIC_API_BASE_URL', async () => {
    process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL = 'https://urbarber-payment-api.example.vercel.app';

    const { chatRepository } = await import('../chat.repository');
    await chatRepository.ensureConversation('booking-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://urbarber-payment-api.example.vercel.app/api/bookings/booking-1/chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('2. never issues a request against the literal string "undefined" when no base URL is configured', async () => {
    delete process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    const { chatRepository } = await import('../chat.repository');
    await chatRepository.ensureConversation('booking-1');

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('undefined');
    expect(calledUrl).toBe('http://localhost:3000/api/bookings/booking-1/chat');
  });
});
