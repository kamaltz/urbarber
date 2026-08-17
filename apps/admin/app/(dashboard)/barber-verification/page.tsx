'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberRegistration } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BarberVerificationPage() {
  const { admin } = useAdminAuth();
  const [registrations, setRegistrations] = useState<AdminBarberRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const loadRegistrations = async (filterValue?: typeof filter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminApiClient.getBarberRegistrations(filterValue || filter, 20);
      setRegistrations(data.items);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat registrasi'));
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, [filter]);

  if (loading && registrations.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          Verifikasi Barber
        </h1>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          Verifikasi Barber
        </h1>
        <p style={{ color: '#6b7280' }}>
          Kelola dan verifikasi registrasi barber yang masuk ke platform.
        </p>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: filter === f ? '600' : '500',
              backgroundColor: filter === f ? '#3b82f6' : '#f3f4f6',
              color: filter === f ? 'white' : '#1f2937',
              fontSize: '0.875rem',
            }}
          >
            {f === 'all' ? 'Semua' : f === 'pending' ? 'Menunggu' : f === 'approved' ? 'Disetujui' : 'Ditolak'}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#7f1d1d',
            marginBottom: '2rem',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Registrations List */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {registrations.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Tidak ada registrasi untuk ditampilkan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Nama Bisnis
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Pemilik
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Kontak
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.barberId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem', color: '#1f2937' }}>
                      <div style={{ fontWeight: '500' }}>{reg.businessName}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(reg.submittedAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#1f2937' }}>{reg.ownerName}</td>
                    <td style={{ padding: '1rem', color: '#1f2937', fontSize: '0.875rem' }}>
                      {reg.phoneNumber}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor:
                            reg.verificationStatus === 'pending'
                              ? '#fef3c7'
                              : reg.verificationStatus === 'approved'
                                ? '#dcfce7'
                                : '#fee2e2',
                          color:
                            reg.verificationStatus === 'pending'
                              ? '#92400e'
                              : reg.verificationStatus === 'approved'
                                ? '#166534'
                                : '#991b1b',
                        }}
                      >
                        {reg.verificationStatus === 'pending' ? 'Menunggu' : reg.verificationStatus === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link
                        href={`/barber-verification/${reg.barberId}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #e5e7eb',
                          backgroundColor: 'white',
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                        }}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
