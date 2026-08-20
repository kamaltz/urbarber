'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { getFirebaseAuthErrorMessage } from '@/lib/errors';
import { firebaseAuth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './login.module.css';

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
      // Every Firebase Auth error code is mapped to a friendly Indonesian
      // message -- the raw FirebaseError.message (e.g. "Firebase: Error
      // (auth/api-key-not-valid.-please-pass-a-valid-api-key.).") must never
      // reach this screen, regardless of which specific error comes back.
      if (err instanceof FirebaseError) {
        setError(getFirebaseAuthErrorMessage(err));
      } else {
        setError('Login gagal. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.brandPanel}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/urbarber-logo.png" alt="URBarber" className={styles.brandLogo} />
        <h2 className={styles.brandHeadline}>Kelola platform URBarber dengan mudah dan aman.</h2>
        <p className={styles.brandSubtext}>
          Pantau barber, booking, transaksi, dan pengaturan layanan dari satu dasbor administrasi.
        </p>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.card}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/urbarber-logo.png" alt="URBarber" className={styles.mobileLogo} />
          <h1 className={styles.title}>Masuk Admin</h1>
          <p className={styles.subtitle}>Platform administrasi URBarber</p>

          <form onSubmit={handleLogin}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="username"
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={styles.input}
                disabled={loading}
              />
            </div>

            {error && (
              <div className={styles.errorBanner} role="alert">
                <span aria-hidden="true">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading && <span className={styles.spinner} aria-hidden="true" />}
              {loading ? 'Sedang login...' : 'Login'}
            </button>
          </form>

          <p className={styles.footerText}>Hubungi administrator untuk akses admin.</p>
        </div>
      </div>
    </div>
  );
}
