/**
 * Unit Tests for resolveCustomerDisplayName / resolveCustomerAvatarUrl
 *
 * Regression guard for the live device finding that Customer Home showed a
 * stale name/photo after editing Profile. The screens (Home, Profile,
 * Account) all derive their displayed identity through these two functions,
 * so the canonical-first precedence -- customers/{uid} (CustomerProfile) over
 * Firebase Auth's displayName/photoURL -- is locked in here once instead of
 * duplicated (and potentially drifting) across three screens.
 */
import { describe, expect, it } from 'vitest';
import { resolveCustomerAvatarUrl, resolveCustomerDisplayName } from '../profile-display';

describe('resolveCustomerDisplayName', () => {
  it('1. prefers the canonical Firestore profile name over Firebase Auth displayName', () => {
    const name = resolveCustomerDisplayName(
      { name: 'Nama Baru dari Firestore' } as any,
      { displayName: 'Nama Lama dari Auth' }
    );

    expect(name).toBe('Nama Baru dari Firestore');
  });

  it('2. a newer canonical profile name is never overridden by an auth displayName, even a non-empty one', () => {
    const name = resolveCustomerDisplayName(
      { name: 'Updated After Edit' } as any,
      { displayName: 'Stale Auth Name', email: 'user@example.com' }
    );

    expect(name).toBe('Updated After Edit');
  });

  it('3. falls back to auth displayName when the profile has no name yet', () => {
    const name = resolveCustomerDisplayName(null, { displayName: 'Auth Fallback Name' });

    expect(name).toBe('Auth Fallback Name');
  });

  it('4. falls back to the email local-part when neither profile name nor auth displayName exist', () => {
    const name = resolveCustomerDisplayName(null, { email: 'someone@example.com' });

    expect(name).toBe('someone');
  });

  it('5. falls back to the provided default when profile, displayName, and email are all absent', () => {
    const name = resolveCustomerDisplayName(null, null, 'Pelanggan');

    expect(name).toBe('Pelanggan');
  });

  it('6. an empty-string profile name is treated as absent and falls through to auth displayName', () => {
    const name = resolveCustomerDisplayName({ name: '' } as any, { displayName: 'Auth Name' });

    expect(name).toBe('Auth Name');
  });
});

describe('resolveCustomerAvatarUrl', () => {
  it('1. prefers the canonical Firestore profileImageUrl over Firebase Auth photoURL', () => {
    const url = resolveCustomerAvatarUrl(
      { profileImageUrl: 'https://storage.example.com/new-avatar.jpg' } as any,
      { photoURL: 'https://old-auth-photo.example.com/a.jpg' }
    );

    expect(url).toBe('https://storage.example.com/new-avatar.jpg');
  });

  it('2. falls back to auth photoURL when the profile has no image yet', () => {
    const url = resolveCustomerAvatarUrl(null, { photoURL: 'https://old-auth-photo.example.com/a.jpg' });

    expect(url).toBe('https://old-auth-photo.example.com/a.jpg');
  });

  it('3. returns undefined (not null or empty string) when no source has an image', () => {
    const url = resolveCustomerAvatarUrl(null, null);

    expect(url).toBeUndefined();
  });
});
