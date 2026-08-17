'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { getErrorMessage } from '@/lib/errors';
import { firebaseAuth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import {
    AuthErrorCodes,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, loading: authLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  if (!authLoading && authenticated) {
    router.replace('/');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // Auth state change will handle redirect via useEffect in layout
    } catch (err) {
      if (err instanceof FirebaseError && err.code === AuthErrorCodes.USER_DELETED) {
        setError('Akun tidak ditemukan.');
      } else if (err instanceof FirebaseError && err.code === AuthErrorCodes.INVALID_PASSWORD) {
        setError('Email atau password salah.');
      } else if (err instanceof FirebaseError && err.code === AuthErrorCodes.USER_DISABLED) {
        setError('Akun telah dinonaktifkan.');
      } else {
        setError(getErrorMessage(err, 'Login gagal. Coba lagi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          URBarber Admin
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Platform administrasi URBarber
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#9ca3af' : '#208aef',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sedang login...' : 'Login'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
          Hubungi administrator untuk akses admin.
        </p>
      </div>
    </div>
  );
}
