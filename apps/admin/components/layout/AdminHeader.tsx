'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import type { AdminIdentity } from '@/lib/api-client';
import type { User as FirebaseUser } from 'firebase/auth';

export function AdminHeader({
  admin,
  firebaseUser,
}: {
  admin: AdminIdentity | null;
  firebaseUser: FirebaseUser | null;
}) {
  const router = useRouter();
  const { logout } = useAdminAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const userDisplayName = admin?.displayName || firebaseUser?.displayName || admin?.email || 'Admin';

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
        URBarber Admin
      </h1>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#1f2937',
          }}
        >
          <span>👤</span>
          <span>{userDisplayName}</span>
          <span style={{ fontSize: '0.625rem' }}>▼</span>
        </button>

        {showMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 50,
            minWidth: '200px',
          }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
