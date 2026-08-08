'use client';

import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    admin,
    firebaseUser,
    loading,
    authenticated,
    unauthorized,
    backendUnavailable,
  } = useAdminAuth();

  // Show loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authenticated) {
    if (unauthorized) {
      router.replace('/unauthorized');
      return null;
    }
    if (backendUnavailable) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
              Layanan Backend Tidak Tersedia
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Sistem sedang mengalami gangguan. Silakan coba lagi dalam beberapa menit.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#208aef',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }
    router.replace('/login');
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <AdminSidebar admin={admin} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader admin={admin} firebaseUser={firebaseUser} />
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: '100%', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
