'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminUserRecord } from '@/lib/api-client';
import { useEffect, useState } from 'react';

type ModalState = null | { type: 'suspend'; userId: string; displayName: string };

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'barber'>('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async (filterValue?: typeof roleFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminApiClient.getUsers(filterValue || roleFilter, 20);
      setUsers(data.items);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pengguna');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleReactivate = async (userId: string) => {
    try {
      setActionLoading(true);
      await AdminApiClient.updateUserStatus(userId, 'active', 'Reaktivasi');
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Gagal mengaktifkan pengguna');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!actionReason.trim()) {
      alert('Alasan penangguhan tidak boleh kosong');
      return;
    }

    if (userId === admin?.uid) {
      alert('Admin tidak dapat menangguhkan diri sendiri');
      return;
    }

    try {
      setActionLoading(true);
      await AdminApiClient.updateUserStatus(userId, 'suspended', actionReason);
      setModal(null);
      setActionReason('');
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Gagal menangguhkan pengguna');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          Manajemen Pengguna
        </h1>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          Manajemen Pengguna
        </h1>
        <p style={{ color: '#6b7280' }}>
          Kelola status dan akses pengguna platform.
        </p>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['all', 'customer', 'barber'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setRoleFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: roleFilter === f ? '600' : '500',
              backgroundColor: roleFilter === f ? '#3b82f6' : '#f3f4f6',
              color: roleFilter === f ? 'white' : '#1f2937',
              fontSize: '0.875rem',
            }}
          >
            {f === 'all' ? 'Semua' : f === 'customer' ? 'Pelanggan' : 'Barber'}
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

      {/* Users List */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Tidak ada pengguna untuk ditampilkan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Nama
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Email
                  </th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Role
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
                {users.map((user) => (
                  <tr key={user.uid} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem', color: '#1f2937' }}>
                      <div style={{ fontWeight: '500' }}>{user.displayName || 'N/A'}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(user.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#1f2937', fontSize: '0.875rem' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: user.role === 'customer' ? '#dbeafe' : '#e9d5ff',
                          color: user.role === 'customer' ? '#0c4a6e' : '#5b21b6',
                        }}
                      >
                        {user.role === 'customer' ? 'Pelanggan' : 'Barber'}
                      </span>
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
                            user.status === 'active'
                              ? '#dcfce7'
                              : user.status === 'pending_verification'
                                ? '#fef3c7'
                                : '#fee2e2',
                          color:
                            user.status === 'active'
                              ? '#166534'
                              : user.status === 'pending_verification'
                                ? '#92400e'
                                : '#991b1b',
                        }}
                      >
                        {user.status === 'active'
                          ? 'Aktif'
                          : user.status === 'pending_verification'
                            ? 'Menunggu Verifikasi'
                            : 'Ditangguhkan'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.status === 'suspended' ? (
                        <button
                          onClick={() => handleReactivate(user.uid)}
                          disabled={actionLoading}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: '#10b981',
                            color: 'white',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            opacity: actionLoading ? 0.6 : 1,
                          }}
                        >
                          {actionLoading ? 'Proses...' : 'Aktifkan'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setModal({ type: 'suspend', userId: user.uid, displayName: user.displayName || user.email })}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            backgroundColor: user.uid === admin?.uid ? '#f3f4f6' : 'white',
                            color: user.uid === admin?.uid ? '#9ca3af' : '#ef4444',
                            cursor: user.uid === admin?.uid ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            opacity: user.uid === admin?.uid ? 0.5 : 1,
                          }}
                          disabled={user.uid === admin?.uid}
                        >
                          Tangguhkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', maxWidth: '500px', width: '90vw', padding: '2rem', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
                Tangguhkan Pengguna
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Berikan alasan penangguhan untuk {modal.displayName}:
              </p>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Masukkan alasan penangguhan..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  minHeight: '100px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setModal(null);
                    setActionReason('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    color: '#1f2937',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSuspend(modal.userId)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? 'Proses...' : 'Tangguhkan'}
                </button>
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
