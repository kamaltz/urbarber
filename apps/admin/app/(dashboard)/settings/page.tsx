'use client';

import { AdminApiClient, type AdminIdentity } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { firebaseAuth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const identity = await AdminApiClient.getAdminIdentity();
        setAdmin(identity);
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal load admin identity'));
        console.error('Settings error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    try {
      await firebaseAuth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('Gagal logout');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Pengaturan</h1>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Admin Settings</h1>

      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Admin Identity */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Admin Account</h2>
        
        {admin ? (
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Nama</div>
              <div style={{ fontWeight: '600' }}>{admin.displayName || 'Unknown'}</div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Email</div>
              <div style={{ fontWeight: '600' }}>{admin.email}</div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Role</div>
              <div style={{ fontWeight: '600' }}>{admin.appRole}</div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Status</div>
              <div style={{ fontWeight: '600' }}>{admin.status}</div>
            </div>
            
            <div>
              <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>User ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{admin.uid}</div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#6B7280' }}>Admin information not available</div>
        )}
      </div>

      {/* Environment Info */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Environment</h2>
        
        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
          <div style={{ padding: '1rem', backgroundColor: '#FEF3C7', borderRadius: '0.375rem' }}>
            ⚠️ <strong>Deployment belum divalidasi</strong>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Admin Web dan Vercel Backend masih dalam tahap development dan belum di-deploy ke production.
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Actions</h2>
        
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#DC2626';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EF4444';
          }}
        >
          Logout
        </button>
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#F0F9FF',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: '#0369A1',
          borderLeft: '4px solid #0369A1',
        }}
      >
        <strong>Admin Provisioning:</strong>
        <div style={{ marginTop: '0.5rem' }}>
          Admin accounts dapat hanya dibuat oleh operator melalui Firebase Console atau Firebase Admin SDK.
          Self-registration tidak tersedia untuk role admin.
        </div>
      </div>
    </div>
  );
}
