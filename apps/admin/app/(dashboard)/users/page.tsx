'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminUserRecord } from '@/lib/api-client';
import { getAdminErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useEffect, useState } from 'react';

type ModalState = null | { type: 'suspend'; userId: string; displayName: string };

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const { showToast, toastElement } = useToast();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'barber'>('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = async (filterValue?: typeof roleFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminApiClient.getUsers(filterValue || roleFilter, 20);
      setUsers(data.items);
      setHasMore(data.hasMore);
      setNextCursor(data.nextPageStartAfter);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await AdminApiClient.getUsers(roleFilter, 20, nextCursor);
      setUsers((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextPageStartAfter);
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleReactivate = async (userId: string) => {
    try {
      setActionLoading(true);
      await AdminApiClient.updateUserStatus(userId, 'active', 'Reaktivasi');
      showToast('Pengguna berhasil diaktifkan kembali.');
      loadUsers();
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!actionReason.trim()) return;

    try {
      setActionLoading(true);
      await AdminApiClient.updateUserStatus(userId, 'suspended', actionReason);
      showToast('Pengguna berhasil ditangguhkan.');
      setModal(null);
      setActionReason('');
      loadUsers();
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await AdminApiClient.deleteUser(deleteTarget.uid);
      let message = `Pengguna "${deleteTarget.displayName || deleteTarget.email}" berhasil dihapus.`;
      if (result.cancelledBookingsCount > 0) {
        message += ` ${result.cancelledBookingsCount} booking aktif dibatalkan.`;
      }
      if (result.paidBookingsNeedingReviewCount > 0) {
        message += ` ${result.paidBookingsNeedingReviewCount} transaksi lunas memerlukan tinjauan refund manual.`;
      }
      showToast(message);
      setDeleteTarget(null);
      setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.uid));
    } catch (err) {
      setDeleteError(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
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
                                : user.status === 'deleted'
                                  ? '#e2e8f0'
                                  : '#fee2e2',
                          color:
                            user.status === 'active'
                              ? '#166534'
                              : user.status === 'pending_verification'
                                ? '#92400e'
                                : user.status === 'deleted'
                                  ? '#475569'
                                  : '#991b1b',
                        }}
                      >
                        {user.status === 'active'
                          ? 'Aktif'
                          : user.status === 'pending_verification'
                            ? 'Menunggu Verifikasi'
                            : user.status === 'deleted'
                              ? 'Dihapus'
                              : 'Ditangguhkan'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.status === 'deleted' ? (
                        <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>-</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                          {user.uid !== admin?.uid && user.role !== 'admin' && (
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(user);
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                              }}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loadingMore ? 'default' : 'pointer',
              fontWeight: '600',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              fontSize: '0.875rem',
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
        </div>
      )}

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
                  disabled={actionLoading || !actionReason.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    cursor: actionLoading || !actionReason.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: actionLoading || !actionReason.trim() ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? 'Proses...' : 'Tangguhkan'}
                </button>
              </div>
            </>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Hapus Pengguna"
        confirmWord="HAPUS"
        confirmLabel="Hapus Pengguna"
        loading={deleting}
        error={deleteError}
        description={
          <>
            <p>
              Anda akan menghapus <strong>{deleteTarget?.displayName || deleteTarget?.email}</strong>
              {' '}({deleteTarget?.role === 'customer' ? 'Pelanggan' : 'Barber'}).
            </p>
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Menghapus pengguna akan menonaktifkan akun dan membatalkan booking yang masih aktif.
              Riwayat booking dan transaksi tetap disimpan.
            </p>
          </>
        }
        onCancel={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />

      {toastElement}
    </div>
  );
}
