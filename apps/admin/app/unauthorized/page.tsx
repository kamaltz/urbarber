'use client';

import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/features/auth/AdminAuthProvider';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { logout } = useAdminAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          Akses Ditolak
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.5' }}>
          Akun Anda tidak memiliki izin untuk mengakses admin panel. Hubungi administrator platform untuk informasi lebih lanjut.
        </p>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
