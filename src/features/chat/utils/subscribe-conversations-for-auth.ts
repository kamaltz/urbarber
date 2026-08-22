/**
 * Orchestrates chatRepository.subscribeToConversations against Firebase
 * Auth's onAuthStateChanged. Extracted out of useChatConversations so this
 * lifecycle -- specifically "exactly one active conversations listener at a
 * time" -- is unit-testable without a React renderer.
 *
 * onAuthStateChanged's callback return value is NOT a cleanup hook (that's a
 * React useEffect convention, not part of the Firebase Auth SDK contract),
 * and the callback can fire more than once per mount in practice (e.g. an
 * initial `null` before persisted auth state restores, then the real user).
 * Without explicitly unsubscribing the previous conversations listener
 * before creating the next one, each firing leaked another onSnapshot
 * subscription.
 */
export interface AuthUser {
  uid: string;
}

export interface SubscribeConversationsForAuthDeps {
  onAuthStateChanged: (callback: (user: AuthUser | null) => void) => () => void;
  subscribeToConversations: (
    uid: string,
    role: 'customer' | 'barber',
    onNext: (conversations: unknown[]) => void,
    onError: (error: Error) => void
  ) => () => void;
}

export function subscribeConversationsForAuth(
  deps: SubscribeConversationsForAuthDeps,
  role: 'customer' | 'barber',
  onNext: (conversations: unknown[]) => void,
  onError: (error: Error) => void,
  onAuthMissing: () => void
): () => void {
  let unsubscribeConvs: (() => void) | null = null;

  const unsubscribeAuth = deps.onAuthStateChanged((user) => {
    unsubscribeConvs?.();
    unsubscribeConvs = null;

    if (!user) {
      onAuthMissing();
      return;
    }

    unsubscribeConvs = deps.subscribeToConversations(user.uid, role, onNext, onError);
  });

  return () => {
    unsubscribeConvs?.();
    unsubscribeAuth();
  };
}
