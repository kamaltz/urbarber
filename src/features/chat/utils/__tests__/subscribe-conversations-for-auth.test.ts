/**
 * Regression guard for the chat conversations-list duplicate-subscription
 * bug: firebaseAuth.onAuthStateChanged's callback return value is not a
 * React-style cleanup and can fire more than once per mount (e.g. an
 * initial `null` before persisted auth state restores, then the real user).
 * Before the fix, each firing created another chatRepository
 * .subscribeToConversations onSnapshot listener without tearing down the
 * previous one -- duplicate data callbacks and, on any permission error,
 * duplicate console.error/LogBox entries for the same failure.
 */
import { describe, expect, it, vi } from 'vitest';
import { subscribeConversationsForAuth } from '../subscribe-conversations-for-auth';

function makeAuthStateSource() {
  let callback: ((user: { uid: string } | null) => void) | null = null;
  const unsubscribeAuthMock = vi.fn();
  return {
    onAuthStateChanged: (cb: (user: { uid: string } | null) => void) => {
      callback = cb;
      return unsubscribeAuthMock;
    },
    fire: (user: { uid: string } | null) => callback?.(user),
    unsubscribeAuthMock,
  };
}

describe('subscribeConversationsForAuth', () => {
  it('creates exactly one conversations subscription per real user, even when onAuthStateChanged fires twice for the same user (initial null, then restored user)', () => {
    const authSource = makeAuthStateSource();
    const unsubscribeConvsMock = vi.fn();
    const subscribeToConversationsMock = vi.fn().mockReturnValue(unsubscribeConvsMock);

    subscribeConversationsForAuth(
      { onAuthStateChanged: authSource.onAuthStateChanged, subscribeToConversations: subscribeToConversationsMock },
      'customer',
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    authSource.fire(null); // initial unresolved state -- no user yet
    authSource.fire({ uid: 'cust-1' }); // persisted auth restores

    expect(subscribeToConversationsMock).toHaveBeenCalledTimes(1);
    expect(subscribeToConversationsMock).toHaveBeenCalledWith('cust-1', 'customer', expect.any(Function), expect.any(Function));
  });

  it('tears down the previous conversations listener before creating a new one on a subsequent auth event', () => {
    const authSource = makeAuthStateSource();
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    const subscribeToConversationsMock = vi
      .fn()
      .mockReturnValueOnce(firstUnsubscribe)
      .mockReturnValueOnce(secondUnsubscribe);

    subscribeConversationsForAuth(
      { onAuthStateChanged: authSource.onAuthStateChanged, subscribeToConversations: subscribeToConversationsMock },
      'barber',
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    authSource.fire({ uid: 'barb-1' });
    expect(firstUnsubscribe).not.toHaveBeenCalled();

    // Re-auth event for a different user (e.g. account switch) must not leave two live listeners.
    authSource.fire({ uid: 'barb-2' });

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeToConversationsMock).toHaveBeenCalledTimes(2);
    expect(secondUnsubscribe).not.toHaveBeenCalled();
  });

  it('sign-out tears down the active conversations listener and reports auth-missing, without creating a new subscription', () => {
    const authSource = makeAuthStateSource();
    const unsubscribeConvsMock = vi.fn();
    const subscribeToConversationsMock = vi.fn().mockReturnValue(unsubscribeConvsMock);
    const onAuthMissing = vi.fn();

    subscribeConversationsForAuth(
      { onAuthStateChanged: authSource.onAuthStateChanged, subscribeToConversations: subscribeToConversationsMock },
      'customer',
      vi.fn(),
      vi.fn(),
      onAuthMissing
    );

    authSource.fire({ uid: 'cust-1' });
    authSource.fire(null); // sign-out

    expect(unsubscribeConvsMock).toHaveBeenCalledTimes(1);
    expect(onAuthMissing).toHaveBeenCalledTimes(1);
    expect(subscribeToConversationsMock).toHaveBeenCalledTimes(1);
  });

  it('the returned unsubscribe tears down both the active conversations listener and the auth listener', () => {
    const authSource = makeAuthStateSource();
    const unsubscribeConvsMock = vi.fn();
    const subscribeToConversationsMock = vi.fn().mockReturnValue(unsubscribeConvsMock);

    const unsubscribeAll = subscribeConversationsForAuth(
      { onAuthStateChanged: authSource.onAuthStateChanged, subscribeToConversations: subscribeToConversationsMock },
      'customer',
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    authSource.fire({ uid: 'cust-1' });
    unsubscribeAll();

    expect(unsubscribeConvsMock).toHaveBeenCalledTimes(1);
    expect(authSource.unsubscribeAuthMock).toHaveBeenCalledTimes(1);
  });
});
